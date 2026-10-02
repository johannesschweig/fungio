# Technisches Audit: Ineffizienzen

Stand: 2026-10-02 · Basis: Commit `928faa3` · Live gemessen gegen `fungio.de` und Supabase

Diese Datei ersetzt die verlorene 51-Punkte-Liste aus einer früheren Session. Sie ist neu nummeriert.
Commit `7eb3989` hat Foto-Index, Suche, SSR für Look-alikes und Sitemap schon erledigt. Die alte Liste stand danach bei „Caching“, deshalb beginnt diese Liste dort.

**Arbeitsweise:** Erledigte Punkte bekommen `[x]` und eine kurze Notiz „Erledigt“ mit Datum und Commit-Titel (der Hash ändert sich bei Amend), die Nummern bleiben gleich.
Priorität: **P1** = spürbar für Nutzer oder Google, **P2** = lohnt sich, **P3** = Aufräumen.
Der Aufwand ist grob geschätzt: S < 1 h, M = halber Tag, L = mehr.

## Traffic-Kontext (Vercel Analytics, 30 Tage bis 2026-10-02)

Die Prioritäten richten sich nach dem tatsächlichen Traffic:

- 601 Besucher, 1.401 Seitenaufrufe (~47/Tag), **71 % mobil**, Bounce Rate 73 %
- `/mushroom/[id]` 539 Besucher, `/` 64, `/taxa/[id]` 29, Rest jeweils ≤ 13. Die Detailseiten bilden einen langen Schwanz, die meistbesuchte hatte nur 26 Besucher.
- Referrer: DuckDuckGo 183, Ecosia 130, Bing 64, Yahoo 16, **Google 10**. Fast der gesamte Suchtraffic läuft über Bing und Suchmaschinen, die darauf aufbauen.
- 14 % der Besucher kommen aus China, vermutlich nicht erkannte Bots.

Was daraus folgt:

- **Mobile Ladezeit** (Bilder, Bundle) ist wichtiger als Server-Antwortzeit.
- **Edge-Caching bringt wenig.** Bei ~47 Aufrufen pro Tag auf über 10.000 URLs wäre der Cache fast immer kalt, und Last ist kein Thema.
- **Google-Sichtbarkeit** ist die größte Wachstumslücke (siehe 29).

---

## A. Caching

- [ ] **1. HTML wird nie gecacht (P3, S)**
  _Herabgestuft von P1._ Bei dem aktuellen Traffic wäre fast jeder Aufruf trotzdem ein MISS (siehe Traffic-Kontext). Der einzige realistische Nutzen ist eine lange TTL (z. B. 7 Tage): Ein Crawler-Besuch wärmt die Seite vor, und der nächste echte Besucher spart den Kaltstart. Sinnvoll erst mit mehr Traffic oder zusammen mit 30.
  Gemessen: Alle SSR-Seiten liefern `cache-control: public, max-age=0, must-revalidate` und `x-vercel-cache: MISS`. Damit wird jeder Aufruf neu gerendert, und jeder Render fragt Supabase ab. Warme Antwortzeiten liegen bei 0,1–0,45 s (`/all/a` 0,45 s). Bei einem Kaltstart sind es 1,6–2,3 s, das war die Startseite beim ersten Aufruf.
  Die Daten ändern sich nur, wenn die Pipeline läuft, also selten.
  Fix: `routeRules` in `nuxt.config.ts` mit `isr` (Vercel) bzw. `swr`. Vorschlag:
  - `/mushroom/**`, `/taxa/**`, `/all/**`, `/season/*`, `/top-edible/*`, `/region/*` → `isr: 604800` (7 Tage; bei wenig Traffic lieber lang, ein Redeploy leert den Cache ohnehin)
  - `/` → `isr: 3600`, weil „Pilze des Tages“ täglich wechselt
  - **Nicht** cachen: `/region` (Geo-Weiterleitung, siehe 15), `/season` und `/top-edible` (Weiterleitungen je nach Monat oder nur ein kurzes TTL)
  Hinweis: Der `needs_photo_review`-Hook läuft auch im Client (siehe 9). Er funktioniert also weiter, wenn das SSR gecacht ist.
  Prüfen: Nach dem Deploy zeigt `curl -sI https://fungio.de/all/a` beim zweiten Aufruf `x-vercel-cache: HIT`.

- [ ] **2. Fonts und Logo werden bei jedem Seitenaufruf neu geprüft (P2, S)**
  Bleibt P2: Das hilft jedem Besucher ab dem zweiten Seitenaufruf, unabhängig vom Gesamttraffic.
  Gemessen: `/fonts/*.woff2` und `/mushroom.png` liefern `max-age=0, must-revalidate`. Der Browser fragt also für 10 Font-Dateien und das Logo bei jeder Navigation per 304 nach. Die Nuxt-Bundles (`/_nuxt/*`) sind dagegen korrekt `immutable`.
  Fix: `routeRules: { '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }, '/mushroom.png': { headers: { 'cache-control': 'public, max-age=604800' } } }`. Die Font-Dateinamen sind versioniert (`v20`, `v33`), `immutable` ist dort also sicher.

- [ ] **3. Client-seitige Supabase-Reads sind ungecacht (P3, folgt aus 4 und 6)**
  Taxa-Seiten, Breadcrumb und `/taxa` laden erst nach dem Hydrieren im Browser. Diese Requests kann kein Edge-Cache abfangen. Sobald sie per SSR laufen (4, 6), cacht ISR (1) sie mit.

## B. Datenzugriff

- [ ] **4. Taxa-Seiten rendern auf dem Server leer (P1, M)**
  Gemessen: `curl https://fungio.de/taxa/48339` liefert `<title>Taxon wird geladen... | Fungio</title>` und den Text „Daten werden geladen…“. `useTaxonById`, `useTaxonPage` und `useAllOrders` laden nur in `onMounted` (`app/composables/composables.ts:444`, `:544`, `:558`). Rund 3.600 Taxa-URLs aus der Sitemap sind für Google deshalb leer. Im Browser entsteht eine Kette aus 4–5 nacheinander laufenden Requests: Taxon → Nachfahren → Kind-Taxa → Attribute und Fotos → Breadcrumb.
  Fix: auf `useAsyncData` umstellen (Taxon und Seitendaten in einem `await`). Idealerweise ersetzt eine einzige RPC alles (siehe 5).
  Traffic: Bisher nur 29 Besucher pro Monat auf Taxa-Seiten. Das liegt aber auch daran, dass Suchmaschinen dort nichts finden. Bleibt deshalb P1 wegen SEO (siehe 29).

- [ ] **5. Zeilenlimit schneidet Taxa-Seiten ab (P1, M)**
  Gemessen: Die Ordnung Agaricales hat 3.345 Arten, PostgREST liefert aber nur 1.500 (`content-range: 0-1499/3345`). Dadurch fehlen 4 von 57 Familien (Stephanosporaceae, Crassisporiaceae, Asproinocybaceae, Baisuzheniaceae). Außerdem gehen 282 KB an den Browser, nur um daraus 53 Kärtchen zu bauen.
  Die Regex-Suche `ancestry=match.(^|/)ID(/|$)` ist an sich schnell (~0,15 s). Das Problem ist die Menge.
  Fix: eine Postgres-Funktion `get_taxon_children(taxon_id)`. Sie gruppiert in der DB nach Kind-Taxon und gibt pro Kind das beliebteste Beispiel samt erstem Foto zurück, das sind nur ~50 Zeilen. Muss im SQL-Editor laufen, dazu ein Snippet unter `app/migrations/` anlegen.

- [ ] **6. Gattungsseiten laden alle Fotos aller Arten (P1, S)**
  Gemessen bei Russula: 247 Arten führen zu 1.500 Fotozeilen (wieder abgeschnitten), 272 KB, **2,8 s**. Jede Karte braucht aber nur ein Foto. Wegen des Limits zeigen außerdem 26 der 84 Arten mit Foto einen Platzhalter.
  Ursache: `enrichFungi` (`composables.ts:392`) lädt `photos` ohne Begrenzung pro Pilz.
  Fix: nur das erste Foto pro Pilz laden, z. B. per `DISTINCT ON (fungi_id) … ORDER BY fungi_id, id` in der RPC aus 5. Schnelle Zwischenlösung: GraphQL mit `photosCollection(first: 1)`.

- [ ] **7. Breadcrumb lädt nur im Browser (P1, S)**
  _Hochgestuft von P2._ Betrifft die Detailseiten, also ~90 % des Traffics. Es ist die günstigste Maßnahme für die Google-Sichtbarkeit (siehe 29).
  `MushroomBreadcrumb.vue:48` holt die Taxonomie-Kette in `onMounted`. Gemessen: Die Detailseite enthält im SSR-HTML keinen einzigen `/taxa/`-Link. Damit fehlt Google die interne Verlinkung zur Taxonomie, und jede Detailseite braucht nach dem Laden noch einen Request.
  Fix: `useAsyncData(\`breadcrumb-${ancestry}\`, …)`.

- [ ] **8. Startseite fragt bei jedem Aufruf eine leere Suche ab (P3, S)**
  `useSearchShrooms` (`composables.ts:142`) feuert `SEARCH_MUSHROOMS` auch mit `search: ''`. Gemessen: Das ist ein Roundtrip von ~0,1 s mit 0 Treffern, bei jedem SSR der Startseite.
  Fix: Query nur ausführen, wenn `store.search` gesetzt ist.

- [ ] **9. Foto-Review-Flag wird doppelt und unzuverlässig gesetzt (P2, S)**
  `watch(flatShroom, …, { immediate: true })` (`composables.ts:41`) läuft auf dem Server **und** beim Hydrieren im Client. Das ergibt 2 PATCH-Requests pro Besuch bei ungescorten Pilzen. Auf dem Server wird der Request nicht abgewartet, Vercel kann die Funktion also vorher beenden.
  Fix: nur im Client ausführen (`if (import.meta.server) return` bzw. `onMounted`). Mit ISR (1) liefe die Server-Variante ohnehin nur noch bei einem Cache-Miss.

- [ ] **10. Autocomplete ohne Debounce (P3, S)**
  `useSearchMushroomNames` (`composables.ts:97`) schickt ab 4 Zeichen bei jedem Tastendruck einen Request. Eine ältere Antwort kann dabei eine neuere überschreiben. Gemessen ~0,1 s pro Request, also nicht dramatisch.
  Fix: `refDebounced(query, 200)` aus `@vueuse/core` (schon installiert).

- [ ] **11. „Pilze des Tages“: Offset ohne Sortierung, Stand vom Modul-Load (P2, S)**
  `GET_RANDOM_FUNGI` (`queries.ts:45`) nutzt `offset: seedToday(9900)` ohne `orderBy`. Die Reihenfolge ist damit nicht definiert. Gemessen: Nur 8 von 20 Treffern haben ein Foto, statt 12 werden also meist ~8 Pilze angezeigt. `OFFSET` wird außerdem beim Laden des Moduls berechnet. Eine warme Server-Instanz behält über Mitternacht den alten Tag, der Browser rechnet den neuen. Das führt zu einem Hydration-Mismatch.
  Fix: Offset in `useRandomFungiWithPhoto` berechnen und als Variable übergeben, `orderBy: id` setzen und nur Pilze mit Foto abfragen (z. B. über die View `fungi_seasonal`, `photo_url` ist dort nicht null).

- [ ] **12. Regionalseite filtert Flechten erst im Browser (P3, S)**
  `GET_TOP_REGIONAL` lädt 30 Einträge, `useRegionalMushrooms` (`composables.ts:345`) wirft danach Flechten raus und schneidet auf 10 ab. Sind mehr als 20 der Top 30 Flechten, erscheinen weniger als 10 Pilze.
  Fix: Filter in eine View oder RPC verschieben.

- [ ] **13. Detailseite: zwei GraphQL-Roundtrips nacheinander (P3, M)**
  `mushroom/[id].vue:24` wartet auf den Pilz und lädt erst danach die Look-alikes, das kostet ~0,1 s zusätzlich im SSR. Mit ISR (1) fällt das kaum noch ins Gewicht. Optional: eine RPC, die beides liefert.

- [ ] **14. Sitemap lädt Pilze und Taxa nacheinander (P3, S)**
  `server/api/__sitemap__/urls.ts:44` holt die ~14 Seiten aus `fungi` und `taxa` hintereinander. Fix: `Promise.all`.

- [ ] **15. `/region` ruft `ipapi.co` auch auf dem Server auf (P2, S)**
  `pages/region/index.vue:29` läuft im SSR. Damit wird der Vercel-Server geortet statt der Besucher, der SSR wartet auf einen Fremddienst, und das Gratis-Kontingent von ipapi wird mitverbraucht.
  Fix: Vercel liefert den Header `x-vercel-ip-country-region` umsonst. Damit serverseitig per `navigateTo` weiterleiten, ganz ohne Fremddienst.

## C. JavaScript-Bundle

- [ ] **16. Zwei Datenclients im Entry-Bundle (P1, M)**
  Gemessen: Das Entry-Bundle `/_nuxt/D4f0Eybr.js` hat 766 KB roh bzw. ~245 KB komprimiert und wird auf jeder Seite geladen. Es enthält Apollo Client **und** das komplette `supabase-js` mit Auth (GoTrue), Realtime, Storage und Functions. Genutzt wird davon nur PostgREST.
  Fix in zwei Stufen:
  1. Client-seitig `@supabase/postgrest-js` statt `@supabase/supabase-js` verwenden, das spart Auth, Realtime, Storage und Functions.
  2. Mittelfristig nur noch einen Zugriffsweg nutzen. Laufen die REST-Reads nach 4, 6 und 7 per SSR, kann `supabase-js` ganz in `server/` wandern.
  Prüfen mit `npx nuxi analyze`.
  Traffic: 71 % mobil. Auf einem Mittelklasse-Handy kostet das Parsen von ~770 KB JS spürbar Zeit, bevor die Seite reagiert.

- [ ] **17. Apollo-Devtools in Produktion aktiv (P3, S)**
  `nuxt.config.ts` setzt `apollo.clients.default.devtools.enabled: true`. Das verursacht den `connectToDevTools`-Spam aus `TODO.md`.
  Fix: `enabled: process.env.NODE_ENV !== 'production'`.

- [ ] **18. Supabase-Client mit Auth-Session (P3, S, entfällt mit 16)**
  `app/supabase.ts` erstellt den Client mit Standardoptionen. Er versucht dadurch, eine Auth-Session in `localStorage` zu halten und zu erneuern, obwohl es kein Login gibt.
  Fix: `auth: { persistSession: false, autoRefreshToken: false }`.

- [ ] **19. Lightbox wird immer geladen (P3, S)**
  `MushroomGallery.vue` importiert `vue-easy-lightbox` direkt. Fix: erst beim Öffnen laden (`defineAsyncComponent` + `v-if="lightboxVisible"`).

## D. Bilder

- [x] **20. Hauptbild (LCP) ist `loading="lazy"` (P1, S)**
  **Erledigt 2026-10-02** („Write down what slows the site down, show the first photo sooner“): `priority`-Prop an `MushroomImage` und `Card`. Das erste Galeriebild und die erste Karte auf Saison-, Top- und Regionalseiten laden jetzt mit `eager` und `fetchpriority="high"`. Lokal im Produktions-Build (mobiler Viewport, localhost) startete der Bild-Request vorher wie nachher ~8 ms nach dem HTML, der Unterschied ist dort nicht messbar. Wirken sollte es nur bei langsamer Verbindung: Ein `lazy`-Bild wartet aufs Layout, also auf `entry.css` (~1 Roundtrip), und konkurriert ohne `fetchpriority` mit ~245 KB JS. Erwartet sind etwa 0,1–0,3 s schnelleres LCP auf Mobilfunk, nicht live gemessen.
  Gemessen: Auf der Detailseite haben alle Galeriebilder `loading="lazy"`, auch das große erste Bild, das meist das LCP-Element ist. Das gilt auch für die erste Kartenreihe auf Saison-, Top- und Regionalseiten. Der Browser lädt sie dadurch erst spät.
  Fix: erstes Bild mit `loading="eager"` und `fetchpriority="high"`, also eine Prop an `MushroomImage` und `Card`.
  Traffic: Betrifft vor allem die Detailseite (~90 % der Besucher). Auf dem Handy ist das erste Galeriebild ganz oben sichtbar. Der günstigste Fix mit der größten Wirkung.

- [ ] **21. Bilder sind groß, kommen aus den USA und haben keinen Cache-Header (P1, M)**
  Gemessen: Ein iNaturalist-Bild in `medium` hat 270 KB (JPEG), `small` 67 KB. Ausgeliefert wird es direkt aus S3 in den USA mit ~0,5 s TTFB aus Deutschland und ohne `cache-control`. Die Saisonseite mit 12 Karten lädt so ~3 MB Bilder.
  Fix: `@nuxt/image` mit dem Provider `vercel` (oder Vercel Image Optimization direkt). Das liefert WebP/AVIF in passender Breite (~30–50 KB) und cacht sie am Edge in Frankfurt. Vorher das Vercel-Kontingent für Bildtransformationen prüfen. Minimalvariante: `<link rel="preconnect" href="https://inaturalist-open-data.s3.amazonaws.com">`.
  Traffic: 71 % mobil, oft über Mobilfunk im Wald. 270 KB pro Bild sind dort der größte Bremsklotz. Bei ~1.400 Aufrufen pro Monat bleibt man voraussichtlich im Gratis-Kontingent von Vercel, das aber vorher prüfen.

- [ ] **22. Galeriebilder ohne `alt` (P3, S)**
  `MushroomGallery` übergibt `{ photos: [photo] }` als `shroom`. `MushroomImage` setzt aber `:alt="shroom.preferred_common_name"`, das bleibt hier `undefined` (im Live-HTML verifiziert). Fix: Name als eigene Prop übergeben.

## E. Nebenbefunde (Korrektheit, beim Audit aufgefallen)

- [ ] **23. Winter-Saison verfehlt die echten Winterpilze (P1, S)**
  Der Filter `season_from <= 2 AND season_to >= 12` (`queries.ts:153`, Winter = 12→2) trifft nur ganzjährige Pilze (775 Treffer). Die 35 Arten mit Saison über den Jahreswechsel (z. B. Sep→Mär) fallen raus, genau die Winterpilze. In `fungi_seasonal.sql` ist auch `seasonal_priority` für solche Bereiche falsch, weil `season_to - season_from + 1` dort negativ wird.
  Fix: Saison-Überlappung mit Jahreswechsel in der View oder einer RPC rechnen.

- [ ] **24. Karte zeigt „Ganzjährig“ zu oft (P2, S)**
  `Card.vue:44` setzt „Ganzjährig“, sobald `season_from === 1` **oder** `season_to === 12` gilt, also auch bei Jun→Dez. Fix: dieselbe Logik wie `getSeasonText` in `utils.ts` (12 Monate abgedeckt).

- [ ] **25. Saisonfoto kann vom Detailfoto abweichen (P3, S)**
  `fungi_seasonal.photo_url` nutzt `LIMIT 1` ohne `ORDER BY` (siehe Hinweis in `CLAUDE.md`). Fix: `ORDER BY id LIMIT 1`.

- [ ] **26. Top-Speisepilze: Variablen nicht reaktiv (P3, S)**
  `useTopEdibleMushrooms` übergibt `queryVariables.value` statt der Ref (`composables.ts:295`). `refresh()` fragt deshalb mit den alten Variablen ab, falls die Seite wiederverwendet wird. Fix: `queryVariables` direkt übergeben und den `watch` entfernen.

## F. Aufräumen

- [ ] **27. `vercel.json` enthält eine SPA-Rewrite-Regel (P3, S)**
  `"/(.*)" → "/index.html"` stammt aus der Zeit vor SSR. Live wird sie offenbar ignoriert, die Seiten kommen per SSR. Sie verwirrt aber und kann bei einem Preset-Wechsel alles kaputt machen. Fix: entfernen und den Preview-Deploy prüfen.

- [ ] **28. Toter Code aus der alten Filter-Suche (P3, S)**
  Nicht mehr genutzt: `store.filters`, `filteredShrooms`, `getMatches`, `toggleFilter`, `clearFilters`, `filtersActive`, `getNestedValue` (`stores/store.ts`), `getNested`, `toTwColorClass` und `toHexColor` (`utils/utils.ts`) sowie `getCurrentSeason` in `pages/top-edible/index.vue`. `totalFilters` liefert immer 0 und wird nur noch in `pages/index.vue:53` gelesen.

## G. Sichtbarkeit und Infrastruktur (aus dem Analytics-Check)

- [ ] **29. Google schickt kaum Besucher (P1, S zum Prüfen)**
  Google brachte 10 von ~410 Suchbesuchern, obwohl es in Deutschland den größten Marktanteil hat. Bing und die darauf aufbauenden Suchmaschinen (DuckDuckGo, Ecosia, Yahoo) brachten ~390. Die Ursache ist noch unklar.
  Nächster Schritt: In der Google Search Console prüfen, wie viele Seiten indexiert sind, ob die Sitemap (`/sitemap_index.xml`) gelesen wurde und welche Ausschlussgründe es gibt („Gecrawlt – zurzeit nicht indexiert“, Duplikate, Weiterleitungen). Je nach Befund werden dann 4, 7 und die 301-Weiterleitung von ID-only-URLs wichtiger.

- [ ] **30. Vercel-Projekt steht auf Framework „vite“ statt „nuxt“ (P3, S)**
  Gefunden über die Vercel-API (`framework: 'vite'`). Die Seite läuft trotzdem per SSR, weil Nitro das Vercel-Ausgabeformat selbst erzeugt. Für ISR (1) und Bildoptimierung (21) sollte das Preset aber korrekt sein.
  Fix: in den Vercel-Projekteinstellungen auf Nuxt umstellen, zusammen mit 27 und in einem Preview-Deploy prüfen.

---

## Empfohlene Reihenfolge (angepasst an den Traffic)

1. ~~**20**: Hauptbild nicht lazy laden.~~ Erledigt.
2. **29**: Search Console prüfen, das entscheidet, wie wichtig 4 und 7 sind.
3. **7 + 23 + 24**: kleine Fixes, sofort sichtbar.
4. **21**: Bilder verkleinern, die größte Wirkung für mobile Nutzer.
5. **16**: Bundle verkleinern.
6. **4 + 5 + 6** zusammen (Taxa per SSR mit einer RPC), Priorität je nach Ergebnis von 29.
7. **2**, danach der Rest. **1** (Caching) erst bei deutlich mehr Traffic.
