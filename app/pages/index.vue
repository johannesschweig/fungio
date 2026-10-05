<script setup lang="ts">
import Card from '@/components/Card.vue'
import { useStore } from '@/stores/store'
import SearchBar from '~/components/SearchBar.vue'
import { watch } from 'vue'

defineOptions({
  name: 'HomeView'
})

const store = useStore()
const router = useRouter()

const { filteredShrooms, loading, totalCount } = useSearchShrooms()

const { mushroomsOfTheDay } = useRandomFungiWithPhoto()

const title = 'Fungio - Schnelle und einfache Pilzsuche'
const description = 'Dein moderner Pilzführer: Pilze einfach erkennen, Merkmale vergleichen und Arten verstehen. Perfekt für Waldspaziergänge und Hobby-Sammler.'
const image = 'https://fungio.de/mushroom.png'
const url = 'https://fungio.de'

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogUrl: url,
  ogImage: image,
  ogType: 'article'
})

watch(filteredShrooms, (newVal: any) => {
  if (!store.redirected && newVal.length === 1) {
    console.log('Only one result found, navigating to:', newVal[0].name)
    router.push(`/mushroom/${newVal[0].id}`)
    store.redirected = true
  }
})
</script>

<template>
  <div class="max-w-7xl md:mx-auto text-stone-900 flex flex-col h-screen">
    <SearchBar />

    <!-- Results Wrapper -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading state -->
      <div v-if="loading" class="text-stone-500">
        Lade Ergebnisse...
      </div>
      <!-- Mushrooms of the day -->
      <div v-else-if="(store.search === '' && store.totalFilters === 0)" class="text-stone-400 ">
        <div class="flex flex-wrap gap-2">
          <NuxtLink :to="`/mushroom/${shroom.id}`"
            class="relative w-22 h-22 rounded-lg border-2 border-transparent hover:border-amber-600"
            v-for="shroom in mushroomsOfTheDay">
            <NuxtImg :src="proxyPhotoSource(shroom.photos?.[0].url ?? '', 'medium')" preset="photo" :width="IMAGE_WIDTHS.thumb" densities="x1 x2"
              class="absolute inset-0 w-full h-full object-cover rounded-md" loading="lazy" />
          </NuxtLink>
        </div>
        <div class="text-stone-600 mt-2">Pilze des Tages</div>
      </div>
      <!-- Results -->
      <div v-else-if="filteredShrooms.length > 0">
        <div class="text-sm text-stone-500 mb-2">
          {{ totalCount }} Treffer
          {{ totalCount > 30 ? '(30 angezeigt)' : '' }}
        </div>
        <div class="flex flex-col gap-2">
          <Card v-for="shroom in filteredShrooms" :key="shroom.id" :shroom="shroom" :highlight="true" />
        </div>
      </div>
      <!-- Empty: Nothing found -->
      <div v-else-if="filteredShrooms.length === 0" class="text-stone-500">
        Keine Pilze gefunden.
      </div>
    </div>
  </div>
</template>
