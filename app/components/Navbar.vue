<script setup lang="ts">
import Arrow from '@/assets/arrow.svg'
import SearchBar from '@/components/SearchBar.vue'
const route = useRoute()
const router = useRouter()

const routeBaseName = useRouteBaseName()
const isHome = computed(() => routeBaseName(route) === 'index')

function goBack() {
  if (window.history.state.back) {
    router.back()
  } else {
    router.push('/') // Fallback zur Startseite
  }
}
</script>

<template>
  <div class="bg-white border-b border-tan-300 h-16 py-auto flex items-center">
    <div class="max-w-7xl mx-auto px-4 xl:px-0 flex gap-3 items-center w-full">
      <button v-if="!isHome" @click="goBack" class="flex cursor-pointer p-3 bg-white hover:bg-tan-100 w-fit shrink-0">
        <Arrow class="w-4 h-4" />
      </button>
      <div v-if="!isHome" class="h-6 w-px bg-tan-300 shrink-0"></div>
      <NuxtLink to="/" class="flex gap-2 items-center shrink-0 min-h-11">
        <img src="/mushroom.png" alt="Fungio Logo" class="w-8 h-8 inline-block text-tan-100" />
        <div class="text-lg font-bold font-serif text-tan-900" :class="{ 'hidden sm:block': !isHome }">Fungio</div>
      </NuxtLink>
      <SearchBar v-if="!isHome" compact class="flex-1 min-w-0" />
    </div>
  </div>
</template>