<script setup lang="ts">
import Card from '@/components/Card.vue'
import type Shroom from '@/types/Shroom'
import { getMushroomUrl, stateNames } from '@/utils/utils'
import RegionFilter from '~/components/RegionFilter.vue'
import RegionSeoContent from '~/components/RegionSeoContent.vue'

const route = useRoute()

const activeState = computed(() => {
  const param = String(route.params.state).toUpperCase()
  return stateNames[param] ? param : 'DE-BY' // Default to Bayern if invalid
})

const stateName = computed(() => stateNames[activeState.value])

const { mushrooms, loading } = useRegionalMushrooms(activeState)

// SEO & Schema
useSchemaOrg([
  () => defineItemList({
    name: `Häufigste Pilze in ${stateName.value}`,
    description: `Die am häufigsten gemeldeten Pilzarten in ${stateName.value} basierend auf aktuellen Beobachtungsdaten.`,
    itemListElement: mushrooms.value.map((shroom: Shroom, index: number) => ({
      position: index + 1,
      name: shroom.preferred_common_name || shroom.name,
      url: `https://fungio.de${getMushroomUrl(shroom)}`,
      image: shroom.photos?.[0]?.url || '',
    }))
  })
])

const title = computed(() => `Pilzfunde in ${stateName.value} | Top 10 | Fungio`)
const description = computed(() => `Entdecke die Top 10 Pilzfunde in ${stateName.value}. Aktuelle Statistiken zu den häufigsten Arten der Region.`)

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogUrl: computed(() => `https://fungio.de/region/${activeState.value.toLowerCase()}`),
  ogType: 'website',
})
</script>

<template>
  <div class="bg-tan-50 min-h-screen pb-20">
    <div class="max-w-7xl mx-auto px-4 xl:px-0">

      <header class="pt-16 pb-12 max-w-3xl">
        <nav class="mb-4">
          <NuxtLink to="/" class="text-tan-500 hover:text-tan-700 text-sm font-medium">← Zurück zur Übersicht</NuxtLink>
        </nav>
        <h1 class="font-serif text-5xl text-tan-900 leading-tight">
          Pilzfunde in <span class="text-emerald-800">{{ stateName }}</span>
        </h1>
        <p class="mt-6 font-sans text-tan-700 leading-relaxed text-base">
          Basierend auf tausenden Community-Meldungen zeigen wir dir hier die Arten, die in {{ stateName }} am
          häufigsten im Wald anzutreffen sind.
        </p>

        <div class="mt-10 flex flex-wrap gap-2">
          <RegionFilter :active-state="activeState" />
        </div>
      </header>

      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-pulse text-tan-400">Suche regionale Daten...</div>
      </div>

      <main v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="(mushroom, index) in mushrooms" :key="mushroom.id" class="relative group">
          <div
            class="absolute top-2 left-2 z-10 bg-white/90 border border-tan-200 px-3 py-2 rounded-lg font-serif text-tan-900 font-bold">
            #{{ index + 1 }}
          </div>

          <Card :key="mushroom.id" :shroom="mushroom" variant="large" :priority="index === 0"/>
        </div>
      </main>

    </div>

    <RegionSeoContent :region-code="activeState" :region-name="stateName" :total-species="mushrooms.length" :total-observations="mushrooms.reduce((sum: number, shroom: Shroom) => sum + (shroom.regional_obs_count || 0), 0)" />
  </div>
</template>