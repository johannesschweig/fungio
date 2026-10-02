<script setup lang="ts">
import MushroomIcon from '@/assets/mushroom.svg'
import type Shroom from '@/types/Shroom'
import { computed } from 'vue';
import { useStore } from '@/stores/store'
import { getMushroomIcon, getMushroomUrl, capitalizeFirstLetter, normalizeSearch, GERMAN_MONTHS } from '@/utils/utils'

const props = withDefaults(defineProps<{
  shroom: Shroom,
  highlight?: boolean,
  variant?: 'list' | 'large',
  // first card above the fold on the list pages: load its image right away instead of lazily
  priority?: boolean
}>(), {
  variant: 'list',
  highlight: false,
  priority: false
})

const store = useStore()

const iconData = computed(() => getMushroomIcon(props.shroom))

function highlightMatch(text: string) {
  text = capitalizeFirstLetter(text)
  if (!props.highlight) return text
  const query = normalizeSearch(store.search)
  if (!query) return text
  // find the match in the normalized text, then map it back to the original characters
  let normalized = ''
  const origin: number[] = []
  for (let i = 0; i < text.length; i++) {
    for (const ch of normalizeSearch(text[i])) {
      normalized += ch
      origin.push(i)
    }
  }
  const start = normalized.indexOf(query)
  if (start < 0) return text
  const from = origin[start]
  const to = origin[start + query.length - 1] + 1
  return `${text.slice(0, from)}<span class="bg-amber-100 text-stone-950 rounded-lg py-1">${text.slice(from, to)}</span>${text.slice(to)}`
}

const seasonRange = computed(() => {
  if (!props.shroom.season_from || !props.shroom.season_to) return null
  if (props.shroom.season_from === 1 || props.shroom.season_to === 12) return 'Ganzjährig'

  const startMonth = GERMAN_MONTHS[props.shroom.season_from - 1]?.slice(0, 3)
  const endMonth = GERMAN_MONTHS[props.shroom.season_to - 1]?.slice(0, 3)

  if (props.shroom.season_from === props.shroom.season_to) {
    return startMonth
  } else {
    return `${startMonth} - ${endMonth}`
  }
})

</script>

<template>
  <!-- Variant list (small) -->
  <NuxtLink v-if="variant === 'list'" :to="getMushroomUrl(shroom)" :key="`${shroom.name}-list`"
    class="grid grid-cols-[80px_1fr_auto] gap-2 md:gap-3 items-center hover:bg-white rounded-lg">
    <NuxtImg v-if="shroom.photos && shroom.photos.length && shroom.photos?.[0].url"
      :src="getInaturalistImageUrl(shroom.photos?.[0].url, 'medium')" preset="photo" :width="IMAGE_WIDTHS.thumb" densities="x1 x2"
      :alt="shroom.preferred_common_name || shroom.name"
      loading="lazy" class="w-20 h-20 object-cover mr-4 rounded-lg" />
    <div v-else class="w-20 h-20 bg-stone-200 mr-4 rounded-lg flex items-center justify-center">
      <MushroomIcon class="w-12 h-12 text-stone-400" />
    </div>

    <div>
      <div v-if="shroom.preferred_common_name" class="text-lg text-stone-900 font-semibold"
        v-html="highlightMatch(shroom.preferred_common_name)"></div>
      <div class="text-sm md:text-base italic text-stone-500 max-w-[25ch] truncate"
        v-html="highlightMatch(shroom.name)"></div>
    </div>

    <!-- Edibility & Toxicity icons -->
    <div class="hidden md:block mx-2 p-1 w-8 h-8 rounded-lg" :class="iconData.class">
      <component v-if="iconData.icon" :is="iconData.icon"  />
    </div>
  </NuxtLink>

  <!-- Variant grid (big) -->
  <NuxtLink v-else :to="getMushroomUrl(shroom)" :key="`${shroom.name}-large`"
    class="bg-white rounded-2xl border border-tan-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
    <div class="relative h-48 w-full overflow-hidden">
      <NuxtImg v-if="shroom.photos && shroom.photos.length && shroom.photos?.[0].url"
        :src="getInaturalistImageUrl(shroom.photos?.[0].url, 'large')" preset="photo" :width="IMAGE_WIDTHS.card" densities="x1 x2"
        :alt="shroom.preferred_common_name || shroom.name" class="w-full h-full object-cover"
        :loading="priority ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : undefined" />
      <div v-else class="w-full h-full bg-stone-100 flex items-center justify-center">
        <MushroomIcon class="w-16 h-16 text-stone-300" />
      </div>

      <slot name="badge" />
    </div>

    <div class="p-6 flex flex-col grow">
      <div class="flex gap-2 mb-4">
        <span v-if="iconData.icon" class="px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"
          :class="iconData.class">
          <component v-if="iconData.icon" :is="iconData.icon" class="w-4 h-4" />
          {{ iconData.text }}
        </span>
        <span v-if="seasonRange"
          class="bg-tan-100 text-tan-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-2">
          <span>📅</span>
          <span>{{ seasonRange }}</span>
        </span>
      </div>

      <h2 class="text-xl text-stone-900 font-bold font-serif mb-1">{{ shroom.preferred_common_name ||
        capitalizeFirstLetter(shroom.name) }}</h2>
      <p v-if="shroom.preferred_common_name" class="text-sm italic text-stone-500 mb-4">{{
        capitalizeFirstLetter(shroom.name) }}</p>
    </div>
  </NuxtLink>
</template>