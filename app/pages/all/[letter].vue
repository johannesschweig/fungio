<script setup lang="ts">
import { getMushroomUrl, getDisplayName, getCommonName, GERMAN_ALPHABET  } from '@/utils/utils'

const route = useRoute()
const letter = computed(() => String(route.params.letter).toUpperCase())

const { mushrooms } = useMushroomsByLetter(letter) 

// SEO schema and meta tags helper
const title = () => `Pilze mit ${letter.value} - Fungio`
const description = () => `${mushrooms.value?.length || 0} Pilzarten mit Anfangsbuchstabe ${letter.value}. Vollständige Liste mit deutschen und lateinischen Namen.`

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})

const alphabet = GERMAN_ALPHABET.split('')
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <h1 class="text-2xl font-bold mb-2">Pilze mit {{ letter }}</h1>
    <p class="text-stone-600 mb-6">{{ mushrooms?.length || 0 }} Pilzarten</p>

    <!-- Alphabet Navigation -->
    <div class="flex flex-wrap gap-1 mb-6 pb-4 border-b">
      <NuxtLink v-for="l in alphabet" :key="l" :to="`/all/${l.toLowerCase()}`"
        class="px-3 py-1 rounded text-sm transition-colors"
        :class="l === letter ? 'bg-amber-500 text-white font-bold' : 'hover:bg-stone-200'">
        {{ l }}
      </NuxtLink>
    </div>

    <!-- Mushroom List -->
    <ul v-if="mushrooms?.length" class="space-y-1">
      <li v-for="mushroom in mushrooms" :key="mushroom.id">
        <NuxtLink :to="getMushroomUrl(mushroom)" :key="mushroom.name"
          class="block px-3 py-2 hover:bg-stone-100 rounded transition-colors">
          <span class="font-medium">
            {{ getDisplayName(mushroom) }}
          </span>
          <span v-if="getCommonName(mushroom)" class="text-sm text-stone-500 ml-2">
            ({{ mushroom.name }})
          </span>
        </NuxtLink>
      </li>
    </ul>

    <div v-else class="text-stone-500">
      Keine Pilze mit {{ letter }} gefunden.
    </div>
  </div>
</template>