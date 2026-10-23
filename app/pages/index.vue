<script setup lang="ts">
import Card from '@/components/Card.vue'
import SearchBar from '~/components/SearchBar.vue'
import Arrow from '@/assets/arrow.svg'
import { useStore } from '@/stores/store'
import { computed, ref, watch } from 'vue'

defineOptions({ name: 'HomeView' })

const store = useStore()
const router = useRouter()
const { filteredShrooms, loading, error, totalCount, refresh } = useSearchShrooms()
const isSearching = computed(() => store.search !== '' || store.totalFilters > 0)
const photoFailed = ref(false)
const specimenPath = '/mushroom/63401-gemeiner-riesenschirmling'
// Curated from the existing species record; keep the photograph's attribution and license together.
const specimenPhoto = 'https://inaturalist-open-data.s3.amazonaws.com/photos/440636205/square.jpeg'

const title = 'Fungio - Schnelle und einfache Pilzsuche'
const description = 'Dein digitaler Pilzführer: Pilze nach Namen finden, Merkmale kennenlernen und ähnliche Arten entdecken. Für Waldspaziergänge und neugierige Naturfreunde.'
useSeoMeta({ title, ogTitle: title, description, ogDescription: description,
  ogUrl: 'https://fungio.de', ogImage: 'https://fungio.de/mushroom.png', ogType: 'website' })

watch(filteredShrooms, (results) => {
  if (isSearching.value && !store.redirected && results.length === 1) {
    store.redirected = true
    router.push(`/mushroom/${results[0].id}`)
  }
})

function resetSearch() {
  store.setSearch('')
  store.clearFilters()
}
</script>

<template>
  <main class="landing" :class="{ 'landing--searching': isSearching }">
    <section class="opening" aria-label="Fungio Pilzführer">
      <div class="introduction">
        <template v-if="!isSearching">
          <h1>Pilze entdecken. <span>Arten verstehen.</span></h1>
          <p class="intro-copy">Dein digitaler Pilzführer für die kleinen Entdeckungen am Wegesrand. Finde Namen, lerne Merkmale kennen und entdecke die Welt der Pilze.</p>
        </template>
        <h1 v-else class="results-heading">Deine Pilzsuche</h1>
        <div id="pilzsuche" class="landing-search">
          <label for="landing-pilzname">Welchen Pilz möchtest du kennenlernen?</label>
          <SearchBar input-id="landing-pilzname" />
          <p v-if="!isSearching" class="search-hint">Suche mit einem deutschen oder wissenschaftlichen Namen.</p>
        </div>
      </div>

      <figure v-if="!isSearching" class="specimen">
        <NuxtLink :to="specimenPath" class="specimen-link">
          <NuxtImg v-if="!photoFailed" :src="proxyPhotoSource(specimenPhoto, 'large')" preset="photo"
            :width="IMAGE_WIDTHS.hero" densities="x1" loading="eager" fetchpriority="high"
            alt="Zwei Riesenschirmlinge mit schuppigem Hut und hohem Stiel auf einer Wiese"
            class="specimen-photo" @error="photoFailed = true" />
          <div v-else class="photo-fallback">Entdecke den Riesenschirmling im Pilzporträt.</div>
          <div class="specimen-caption">
            <div><strong>Gemeiner Riesenschirmling</strong><span>Macrolepiota procera</span></div>
            <span class="portrait-arrow"><Arrow aria-hidden="true" /><span class="sr-only">Pilzporträt ansehen</span></span>
          </div>
        </NuxtLink>
        <figcaption>Foto: © Lucian Clanet via <a href="https://www.inaturalist.org/photos/440636205" target="_blank" rel="noopener noreferrer">iNaturalist</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · Bildausschnitt</figcaption>
      </figure>
    </section>

    <section v-if="isSearching" class="search-results" aria-label="Suchergebnisse" aria-live="polite" :aria-busy="loading">
      <p v-if="loading" class="result-message" role="status">Pilze werden gesucht …</p>
      <div v-else-if="error" class="result-message" role="alert">
        <h2>Die Suche konnte nicht geladen werden.</h2>
        <p>Bitte versuche es noch einmal.</p>
        <button type="button" class="btn btn-secondary" @click="refresh()">Erneut versuchen</button>
      </div>
      <template v-else-if="filteredShrooms.length">
        <p class="result-count">{{ totalCount }} Treffer {{ totalCount > 30 ? '(30 angezeigt)' : '' }}</p>
        <div class="result-list"><Card v-for="shroom in filteredShrooms" :key="shroom.id" :shroom="shroom" :highlight="true" /></div>
      </template>
      <div v-else class="result-message">
        <h2>Keine Pilze gefunden.</h2>
        <p>Versuche einen anderen Namen oder einen kürzeren Suchbegriff.</p>
        <NuxtLink to="/all" class="text-link">Alle Pilze von A bis Z <Arrow aria-hidden="true" /></NuxtLink>
      </div>
      <button type="button" class="back-to-guide" @click="resetSearch">Zurück zum Entdecken</button>
    </section>

    <template v-else>
      <section id="entdecken" class="discovery" aria-labelledby="discovery-title">
        <div class="section-intro"><h2 id="discovery-title">Folge deiner Neugier.</h2><p>Ein Name im Kopf oder einfach Lust, Neues zu entdecken? Hier geht’s weiter.</p></div>
        <div class="discovery-links">
          <NuxtLink to="/all"><div><h3>Pilze von A bis Z</h3><p>Bekannte Namen finden. Neue Arten kennenlernen.</p></div><Arrow aria-hidden="true" /></NuxtLink>
          <NuxtLink to="/season"><div><h3>Im Lauf der Jahreszeiten</h3><p>Entdecke, wann welche Pilze wachsen.</p></div><Arrow aria-hidden="true" /></NuxtLink>
          <NuxtLink to="/top-edible/all"><div><h3>Speisepilze kennenlernen</h3><p>Eigenschaften entdecken und ähnliche Arten ansehen.</p></div><Arrow aria-hidden="true" /></NuxtLink>
        </div>
      </section>

      <section class="closer-look" aria-labelledby="closer-title">
        <div class="closer-copy"><h2 id="closer-title">Ein Name ist<br>erst der Anfang.</h2><p>Wie sieht der Hut aus? Was befindet sich darunter? Wo und wann wächst die Art? Die Pilzporträts bringen Fotos, Merkmale und Hintergrundwissen zusammen.</p><NuxtLink :to="specimenPath" class="text-link">Ein Pilzporträt entdecken <Arrow aria-hidden="true" /></NuxtLink></div>
      </section>

    </template>
  </main>
</template>

<style scoped>
.landing { max-width: 1280px; margin: 0 auto; color: var(--color-tan-900); }
.landing ::selection { background: var(--color-tan-200); color: var(--color-tan-950); }
.landing :is(a, button, input):focus-visible { outline: 3px solid var(--color-tan-700); outline-offset: 5px; }
.landing a { text-underline-offset: 4px; }
.opening { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: clamp(32px, 5vw, 76px); align-items: center; padding: 56px 0 72px; }
h1, h2, h3 { font-family: var(--font-serif); text-wrap: balance; }
h1 { margin: 0 0 26px; font-size: clamp(40px, 4.65vw, 62px); font-weight: 400; line-height: 1.18; letter-spacing: -.035em; color: var(--color-tan-950); }
h1 span { display: block; color: var(--color-tan-700); }
.intro-copy { max-width: 49ch; font-size: 18px; line-height: 1.8; margin: 0 0 34px; }
.landing-search label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
.landing-search :deep(input) { min-height: 54px; background: white; border-color: var(--color-tan-300); padding-right: 36px; color: var(--color-tan-950); caret-color: var(--color-tan-800); }
.landing-search :deep(input::placeholder) { color: var(--color-tan-700); }
.landing-search :deep(.btn-primary) { min-height: 54px; color: var(--color-tan-950); }
.landing-search :deep(.text-stone-400) { color: var(--color-tan-700); }
.landing-search :deep([role='option']) { color: var(--color-tan-900); }
.search-hint { font-size: 12px; line-height: 1.6; color: var(--color-tan-700); margin: 10px 0 0; }
.text-link { display: inline-flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 600; }
.text-link:hover { text-decoration: underline; }
.text-link svg, .portrait-arrow svg, .discovery-links svg { width: 18px; height: 18px; flex-shrink: 0; transform: rotate(180deg); }
.specimen { margin: 0; min-width: 0; }
.specimen-link { display: block; background: white; border-radius: 14px; overflow: hidden; }
.specimen-photo { width: 100%; height: clamp(300px, 30vw, 395px); object-fit: cover; object-position: 50% 62%; }
.specimen-caption { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; }
.specimen-caption strong { display: block; font-family: var(--font-serif); font-size: 19px; font-weight: 500; }
.specimen-caption span:not(.portrait-arrow, .sr-only) { display: block; font-size: 13px; font-style: italic; margin-top: 5px; color: var(--color-tan-700); }
.portrait-arrow { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--color-tan-100); }
.specimen-link:hover .portrait-arrow { background: var(--color-tan-200); }
.specimen figcaption { font-size: 10px; line-height: 1.6; margin: 9px 4px 0; color: var(--color-tan-700); }
.specimen figcaption a { text-decoration: underline; }
.photo-fallback { min-height: 300px; display: grid; place-content: center; padding: 40px; background: var(--color-tan-200); }
.discovery { display: grid; grid-template-columns: 1fr 1.25fr; gap: 80px; border-top: 1px solid var(--color-tan-300); padding: 64px 0 76px; scroll-margin-top: 28px; }
h2 { font-size: clamp(27px, 3vw, 38px); font-weight: 400; line-height: 1.35; letter-spacing: -.025em; margin: 0 0 20px; }
.section-intro p { font-size: 16px; line-height: 1.8; max-width: 36ch; margin: 0; }
.discovery-links a { display: flex; align-items: center; justify-content: space-between; gap: 25px; padding: 23px 0; border-bottom: 1px solid var(--color-tan-200); }
.discovery-links a:first-child { padding-top: 0; }
.discovery-links h3 { font-size: 20px; margin: 0 0 8px; font-weight: 500; }
.discovery-links p { font-size: 14px; line-height: 1.6; margin: 0; color: var(--color-tan-700); }
.discovery-links a:hover h3 { text-decoration: underline; text-underline-offset: 5px; }
.discovery-links svg { transition: translate 180ms ease-out; }
.discovery-links a:hover svg { translate: 4px; }
.closer-look { background: var(--color-tan-100); border-radius: 16px; padding: 40px 48px; margin-bottom: 64px; }
.closer-copy p { font-size: 15px; line-height: 1.85; max-width: 68ch; margin: 0 0 24px; }
.landing--searching { min-height: 65vh; padding-bottom: 60px; }
.landing--searching .opening { display: block; padding: 24px 0; }
.results-heading { font-size: 32px; }
.result-count { margin-bottom: 16px; font-size: 14px; }
.result-list { display: flex; flex-direction: column; gap: 8px; }
.result-message { padding: 24px 0; }
.result-message h2 { font-size: 24px; }
.result-message p { margin-bottom: 18px; }
.back-to-guide { display: block; margin-top: 30px; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .discovery-links svg { transition: none; } }
@media (max-width: 1050px) { .opening { gap: 32px; } h1 { font-size: 44px; } .intro-copy { font-size: 16px; } .discovery { gap: 40px; } .closer-look { padding: 32px; } }
@media (max-width: 700px) {
  .opening { grid-template-columns: 1fr; padding: 20px 0 32px; gap: 22px; }
  h1 { font-size: clamp(30px, 8.2vw, 48px); margin-bottom: 20px; }
  .intro-copy { font-size: 16px; line-height: 1.6; margin-bottom: 22px; }
  .landing-search :deep(input) { font-size: 16px; padding-left: 12px; }
  .landing-search :deep(.btn-primary) { padding: 12px 14px; font-size: 16px; }
  .specimen-photo { height: clamp(230px, 65vw, 300px); object-position: 50% 54%; }
  .specimen-caption { padding: 17px 20px; }
  .specimen-caption strong { font-size: 18px; }
  .discovery { grid-template-columns: 1fr; padding: 28px 0 32px; gap: 20px; }
  .section-intro p { max-width: 45ch; }
  h2 { font-size: 28px; }
  .discovery-links h3 { font-size: 19px; }
  .closer-look { padding: 24px 20px; margin-bottom: 32px; }
  .text-link, .back-to-guide { min-height: 44px; }
  .landing-search :deep([role="option"]) { display: block; min-height: 48px; }
  .landing-search :deep([role="listbox"]) { max-height: min(240px, 40dvh); overflow-y: auto; overscroll-behavior: contain; }
  .discovery-links p, .closer-copy p { font-size: 16px; line-height: 1.65; }
  .specimen figcaption { font-size: 12px; }
  .specimen figcaption a { display: inline-flex; align-items: center; min-height: 44px; }
}
@media (max-width: 360px) {
  .landing-search :deep(.flex.items-center.gap-2) { flex-wrap: wrap; }
  .landing-search :deep(.btn-primary) { width: 100%; justify-content: center; text-align: center; }

}
</style>
