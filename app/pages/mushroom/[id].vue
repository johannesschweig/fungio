<script setup lang="ts">
import { useMushroomById, useMushroomLookAlikes } from '@/composables/composables'
import { createSlug } from '@/utils/utils'
import MushroomHeader from '@/components/mushroom-detail/MushroomHeader.vue'
import MushroomGallery from '@/components/mushroom-detail/MushroomGallery.vue'
import MushroomQuickStats from '@/components/mushroom-detail/MushroomQuickStats.vue'
import MushroomIntro from '@/components/mushroom-detail/MushroomIntro.vue'
import MushroomCharacteristics from '@/components/mushroom-detail/MushroomCharacteristics.vue'
import MushroomOccurrence from '@/components/mushroom-detail/MushroomOccurrence.vue'
import MushroomSeason from '@/components/mushroom-detail/MushroomSeason.vue'
import MushroomLookAlikes from '~/components/mushroom-detail/MushroomLookAlikes.vue'
import MushroomLinks from '~/components/mushroom-detail/MushroomLinks.vue'
import type Shroom from '~/types/Shroom'

defineOptions({ name: 'MushroomDetail' })

const route = useRoute()
const id = computed(() => {
  const param = String(route.params.id)
  return param.includes('-') ? Number(param.split('-')[0]) : Number(param)
})

const { shroom, loading, ready } = useMushroomById(id)
await ready // look-alike ids must be known before the look-alike query runs, so SSR includes them

const lookAlikeIds = computed(() => shroom.value?.look_alikes ?? [])
const { lookAlikes } = useMushroomLookAlikes(lookAlikeIds)

// URL & SEO Logic
watch(shroom, (newShroom) => {
  if (newShroom && route.params.id) {
    const currentParam = String(route.params.id)
    const slug = createSlug(newShroom.preferred_common_name || newShroom.name)
    const newParam = `${newShroom.id}-${slug}`
    if (currentParam !== newParam) navigateTo(`/mushroom/${newParam}`, { replace: true, redirectCode: 301 })
  }
}, { immediate: true })

const fullUrl = computed(() => {
  if (!shroom.value) return `https://fungio.de/mushroom/${id.value}`
  const slug = createSlug(shroom.value.preferred_common_name || shroom.value.name)
  return `https://fungio.de/mushroom/${shroom.value.id}-${slug}`
})
// SEO schema and meta tags
const title = computed(() => {
  if (!shroom.value) return 'Pilz wird geladen... | Fungio'
  const name = shroom.value.preferred_common_name || shroom.value.name
  return `${name} - Pilzinformationen | Fungio`
})

const description = computed(() => {
  if (!shroom.value) return 'Lade Pilzinformationen...'
  const name = shroom.value.preferred_common_name || shroom.value.name
  const latinName = shroom.value.name
  const edibility = shroom.value.edibility ? capitalizeFirstLetter($t(shroom.value.edibility)) : null
  let desc = `${name} (${latinName})`
  if (edibility) {
    desc += `: Speisewert - ${edibility}`
  }
  desc += '. Detaillierte Informationen zu Merkmalen, Lebensraum und Verwechslungsgefahr.'
  // Truncate to 160 chars for meta description
  return desc.length > 160 ? desc.substring(0, 157) + '...' : desc
})

const image = computed(() => {
  if (!shroom.value?.photos?.[0]?.url) return 'https://fungio.de/mushroom.png'
  return getInaturalistImageUrl(shroom.value.photos[0].url, 'medium')
})

useSchemaOrg([
  () => ({
    '@type': 'Taxon',
    '@id': `${fullUrl.value}#taxon`,
    name: shroom.value?.preferred_common_name,
    scientificName: shroom.value?.name,
    description: description.value,
    image: image.value,
    url: fullUrl.value,
    taxonRank: 'Species',
    mainEntityOfPage: { '@id': `${fullUrl.value}#webpage` }
  }),

  () => defineArticle({
    headline: title.value,
    description: description.value,
    image: image.value,
    datePublished: '2025-09-01', // Ideally pull from your DB if you have a created_at
    author: [{ name: 'Fungio Experten-Team', url: 'https://fungio.de' }],
  }),

])

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogUrl: fullUrl,
  ogImage: image,
  ogType: 'article'
})

useHead({
  link: [
    { rel: 'canonical', href: fullUrl }
  ]
})
</script>

<template>
  <div v-if="shroom" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

    <div class="space-y-6">
      <MushroomHeader :shroom="shroom" />
      <MushroomGallery v-if="shroom.photos && shroom.photos.length" :photos="shroom.photos" />
    </div>

    <div v-if="shroom.id_123" class="space-y-12">
      <MushroomQuickStats :shroom="shroom" />

      <div class="space-y-12">
        <MushroomIntro :shroom="shroom" />
        <MushroomCharacteristics :shroom="shroom" />
        <MushroomOccurrence v-if="shroom.occurrence_text" :shroom="shroom" />
      </div>

      <MushroomSeason :from="shroom.season_from" :to="shroom.season_to" />
      <MushroomLookAlikes :look-alikes="lookAlikes" />

    </div>

    <MushroomIntro v-else :shroom="shroom" />
    <MushroomLinks :shroom="shroom" />
  </div>

  <div v-else-if="loading" class="h-96 flex items-center justify-center text-tan-400">
    Daten werden geladen...
  </div>
  <div v-else class="h-96 flex items-center justify-center text-tan-400">
    Pilz nicht gefunden.
  </div>
</template>