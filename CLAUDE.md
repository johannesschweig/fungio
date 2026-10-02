# Fungio

Deutschsprachiger Pilzführer. Nuxt 4 / Vue 3 App, Supabase als Backend (Postgres + PostgREST + pg_graphql), Pinia für globalen State, Tailwind fürs Styling.

## Stack & Struktur

- **Nuxt 4** (`app/` als Source-Verzeichnis), Vue 3 `<script setup>`.
- **Supabase**: zwei Zugriffswege parallel im Einsatz.
  - GraphQL (`@nuxtjs/apollo`, `useAsyncQuery`/`useLazyQuery`) für die meisten Reads — Queries liegen in `app/composables/queries.ts`.
  - REST via `@supabase/supabase-js` (Client in `app/supabase.ts`) für Dinge, die pg_graphql nicht abbildet, z.B. Taxonomie-Auflösung über `ancestry`-Strings in `app/composables/composables.ts`.
- **Zentrale Composables**: `app/composables/composables.ts` (Datenzugriff/Business-Logik), `app/composables/queries.ts` (GraphQL-Queries), `app/composables/utils.ts` (`flattenFungi` etc. zum Umformen der GraphQL-Response in den `Shroom`-Typ).
- **State**: `app/stores/store.ts` (Pinia, u.a. globale Suche `store.search`, Filter).
- **Seiten**: `app/pages/` — Pilzdetail (`mushroom/[id].vue`), Taxonomie (`taxa/`, basiert auf `ancestry`-Pfaden in der `fungi`-Tabelle), Übersichten nach Buchstabe/Saison/Region/Top-Speisepilze.
- **Migrations**: `app/migrations/*.sql` sind lose SQL-Snippets (kein Migrationstool) — werden manuell im Supabase SQL-Editor ausgeführt. Neue Snippets dort ablegen, aber nicht automatisch ausführen (siehe unten).
- **AUDIT.md** im Repo-Root: nummerierte Liste technischer Ineffizienzen (Caching, Datenzugriff, Bundle, Bilder) mit Messwerten und Fix-Vorschlag. Erledigte Punkte dort abhaken (`[x]` + Datum und Commit-Titel), Nummern nicht ändern. Bei „mach Punkt N“ ist diese Liste gemeint.
- **TODO.md** im Repo-Root: laufende Aufgabenliste (`TODO` / `NOTES` / `DONE` / `DROPPED`). Bei erledigten Aufgaben den Punkt von `TODO` nach `DONE` verschieben (kurze Notiz ergänzen, was genau gemacht wurde), nicht einfach löschen.

## Wichtige Eigenheiten

- **`VITE_SUPABASE_SERVICE_ROLE_KEY`** in `.env` ist trotz des Namens **kein echter Service-Role-Key**, sondern ein `sb_publishable_...`-Key (Supabase's neues Key-System, Nachfolger des alten `anon`-Keys). Er unterliegt RLS und darf im Client-Bundle landen — ist aber nicht "God Mode". Schreibzugriffe, die dieser Key ausführen soll, brauchen eine explizite RLS-Policy (+ ggf. Column-Grant), siehe `app/migrations/fungi_needs_photo_review.sql` als Beispiel-Pattern (Policy erlaubt nur `false → true` auf einer einzelnen Spalte, kein Zurücksetzen, kein Zugriff auf andere Spalten).
- Ich kann kein DDL (ALTER TABLE, CREATE POLICY, …) selbst ausführen — nur `SELECT`/`PATCH` über die REST-API testen. SQL-Änderungen an der DB müssen vom User im Supabase SQL-Editor laufen gelassen werden.
- **Bot-Traffic**: SSR-Requests laufen für Crawler genauso wie für echte Nutzer durch — wo das relevant ist (z.B. Tracking/Flags, die nur bei echten Besuchen gesetzt werden sollen), serverseitig mit `isbot` (`app/composables/composables.ts`, `isBotRequest()`) filtern.
- **Taxonomie**: `taxa`-Tabelle hat keine Parent/Child-Spalte — Abstammung wird aus dem `ancestry`-String (`/`-getrennte ID-Kette) der `fungi`-Tabelle abgeleitet (iNaturalist-Konvention). Rank-Level-Konstanten: 10 = Art, 20 = Gattung, 30 = Familie, 40 = Ordnung (siehe `useTaxonPage`/`useAllOrders`).
- **Fotos**: `photos`-Tabelle hat `fungi_id`, `url`, `quality_score` (aktuell im Aufbau — Foto-Pipeline scort Bilder extern). `needs_photo_review` (bool, `fungi`-Tabelle) markiert Pilze ohne gescorte Fotos für die Pipeline.
- Bilder-URLs: `getInaturalistImageUrl()` in `app/utils/utils.ts` ersetzt `square` im Pfad durch die gewünschte Größe (`small`/`medium`/`large`) — Reihenfolge der `photos`-Query IMMER explizit mit `.order('id')` angeben, sonst kann PostgREST eine andere Reihenfolge liefern als die GraphQL-Queries (die implizit nach `id` sortieren).

## Workflow-Vorgaben

- **Git**: Änderungen committen, aber **nicht automatisch pushen** — der User gibt Push explizit frei. Amend ist ok, wenn der User kleine Folgeänderungen nachreicht, bevor gepusht wurde.
- **Dev-Server**: läuft oft schon extern (User-Terminal) auf Port 3000. Vor `preview_start` prüfen bzw. bei "Port already in use" einfach direkt gegen `localhost:3000` navigieren statt einen zweiten Server zu starten.
- Bei Datenbank-Fragen/Auswertungen: direkte REST-Calls gegen Supabase (`curl` mit den Keys aus `.env`) sind der schnellste Weg, keine extra Scripts nötig.
