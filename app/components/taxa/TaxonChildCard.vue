<script setup lang="ts">
import Card from '@/components/Card.vue'
import MushroomIcon from '@/assets/mushroom.svg'
import type { TaxonChildEntry } from '@/composables/composables'
import { getTaxonUrl, getMushroomUrl, capitalizeFirstLetter } from '@/utils/utils'

const props = defineProps<{ entry: TaxonChildEntry }>()

const isSpecies = computed(() => props.entry.rank_level === 10)
const thumbnail = computed(() => props.entry.mushroom.photos?.[0]?.url ?? null)
</script>

<template>
  <!-- Species-level child (on a genus page): the child IS the example mushroom -->
  <Card v-if="isSpecies" :shroom="entry.mushroom" variant="large" />

  <!-- Family/genus-level child (on an order/family page): the taxon's most popular species
       supplies the card image, the taxon name links to its own /taxa/ page, and the example
       mushroom is a plain text link underneath (kept as a sibling link, not a nested <a>) -->
  <div v-else class="bg-white rounded-2xl border border-tan-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
    <NuxtLink :to="getTaxonUrl(entry)" class="relative h-48 w-full overflow-hidden block">
      <NuxtImg v-if="thumbnail" :src="proxyPhotoSource(thumbnail, 'large')" preset="photo" :width="IMAGE_WIDTHS.card" densities="x1 x2"
        :alt="entry.preferred_common_name || entry.name" class="w-full h-full object-cover" loading="lazy" />
      <div v-else class="w-full h-full bg-stone-100 flex items-center justify-center">
        <MushroomIcon class="w-16 h-16 text-stone-300" />
      </div>
    </NuxtLink>

    <div class="p-6 flex flex-col grow gap-2">
      <NuxtLink :to="getTaxonUrl(entry)" class="group">
        <h2 class="text-xl text-stone-900 font-bold font-serif mb-1 group-hover:underline">
          {{ entry.preferred_common_name || capitalizeFirstLetter(entry.name) }}
        </h2>
        <p v-if="entry.preferred_common_name" class="text-sm italic text-stone-500">{{ capitalizeFirstLetter(entry.name) }}</p>
      </NuxtLink>

      <NuxtLink :to="getMushroomUrl(entry.mushroom)" class="text-sm text-tan-600 hover:text-tan-900 hover:underline mt-auto pt-3">
        Beliebter Vertreter: <span class="font-semibold">{{ entry.mushroom.preferred_common_name || capitalizeFirstLetter(entry.mushroom.name) }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
