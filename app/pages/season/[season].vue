<script setup lang="ts">
import { useMushroomsBySeason } from '@/composables/composables'
import { SEASONS } from '@/utils/utils'
import Card from '@/components/Card.vue'
import SeasonFilter from '~/components/SeasonFilter.vue'
import type Shroom from '~/types/Shroom'
import { getMushroomUrl } from '~/utils/utils'

defineOptions({
  name: 'SeasonView'
})

const route = useRoute()
const season = computed(() => {
  const param = String(route.params.season).toLowerCase()
  return Object.values(SEASONS).find(s => s.key === param)
})

// Validate season
watch(season, (newSeason) => {
  if (!newSeason) {
    navigateTo('/', { replace: true })
  }
}, { immediate: true })

const { seasonalMushrooms, loading } = useMushroomsBySeason(
  computed(() => season.value?.monthFrom ?? 3),
  computed(() => season.value?.monthTo ?? 5)
)

// SEO schema and meta tags helper
const seasonalTitle = computed(() => {
  const s = season.value?.key
  return s ? `Häufige Pilze im ${$t(s)}` : 'Häufige Pilzfunde'
})

const title = computed(() => season.value ? `${season.value.headline} | Fungio` : 'Saison | Fungio')
const description = computed(() => season.value ? `${season.value.headline} - ${season.value.subheadline}` : '')
const url = computed(() => `https://fungio.de/season/${season.value?.key}`)

useSchemaOrg([
  () => defineWebPage({
    '@type': 'CollectionPage',
    name: title.value,
    description: description.value,
  }),
  
  () => defineItemList({
    name: seasonalTitle.value,
    description: `Übersicht der am häufigsten vorkommenden Pilze Deutschlands für die Jahreszeit: ${$t(season.value?.key)}.`,
    itemListElement: seasonalMushrooms.value.map((shroom: Shroom, index: number) => ({
      position: index + 1,
      name: shroom.preferred_common_name || shroom.name,
      url: `https://fungio.de${getMushroomUrl(shroom)}`,
      image: shroom.photos?.[0]?.url || '',
    }))
  })
])

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogUrl: url,
  ogType: 'website'
})
</script>

<template>
  <div v-if="season" class="min-h-screen">

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">

        <div class="space-y-2">
          <span class="text-xs font-bold tracking-widest text-tan-500 uppercase">
            Aktuelle Saison
          </span>
          <h1 class="text-4xl md:text-6xl font-serif font-bold text-[#3E3832]">
            {{ season.headline }}
          </h1>
          <p class="text-lg md:text-xl font-serif italic text-tan-500">
            {{ season.subheadline }}
          </p>
        </div>

        <SeasonFilter :active-season="season.key" base-path="/season" />
      </div>

      <div class="mb-8 border-b border-tan-200 pb-4">
        <h2 class="text-2xl font-serif font-bold text-[#3E3832]">
          Häufige Funde im {{ season.nameGerman }}
        </h2>
      </div>

      <div v-if="loading" class="text-center py-20">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-tan-200 border-t-tan-600"></div>
        <p class="mt-4 text-tan-500 font-serif italic">Der Wald wird durchsucht...</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card v-for="(mushroom, index) in seasonalMushrooms" :key="mushroom.id" :shroom="mushroom" variant="large" :priority="index === 0"/>
      </div>

      <div v-if="!loading && seasonalMushrooms.length === 0"
        class="text-center py-20 bg-white rounded-xl border border-tan-100 shadow-sm">
        <p class="text-tan-500 font-serif italic text-lg">
          Keine Pilze für diese Saison gefunden.
        </p>
      </div>
    </div>
  </div>
</template>
