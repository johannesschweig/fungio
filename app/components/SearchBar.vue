<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/vue'
import SearchIcon from '@/assets/search.svg'
import { useStore } from '@/stores/store'

const props = withDefaults(defineProps<{ compact?: boolean, inputId?: string }>(), { compact: false })

const store = useStore()
const route = useRoute()
const router = useRouter()
const query = ref(store.search)
// ComboboxInput displays displayValue(selected), not the :value prop — so this needs the
// same initial value as `query`, or the input renders blank on mount despite a non-empty search
const selected = ref(store.search)
const { suggestions } = useSearchMushroomNames(query)

// When selected suggestion changes, update search
watch(selected, (val) => {
  if (val && val !== store.search) {
    applySearch(val)
  }
})

function applySearch(val?: string) {
  const searchVal = val ?? query.value
  store.setSearch(searchVal)
  selected.value = searchVal
  query.value = searchVal
  // results only render on the home page, so searching from elsewhere (e.g. the navbar) takes you there
  if (route.path !== '/') {
    router.push('/')
  }
}

function clearSearch() {
  query.value = ''
  selected.value = ''
  store.setSearch('')
}

// Keep both input text and the combobox selection in sync with external searches/resets.
watch(() => store.search, (newSearch) => {
  query.value = newSearch
  selected.value = newSearch
})
</script>

<template>
  <!-- Search Bar -->
  <div class="flex items-center gap-2 relative" :class="compact ? '' : 'mb-2'">
    <div class="w-full min-w-0 relative">
      <Combobox v-model="selected" nullable>
        <ComboboxInput enterkeyhint="search" autocapitalize="none" :id="inputId" :aria-label="inputId ? undefined : 'Pilzname'" :displayValue="(val) => typeof val === 'string' ? val : ''" :value="query"
          @input="query = $event.target.value" :placeholder="compact ? 'Suche...' : inputId ? 'Pilzname eingeben' : 'Suche nach Namen (de, lat.)'"
          class="w-full px-4 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring focus:ring-amber-400"
          @blur.capture.stop @keyup.enter="applySearch()" />
        <button v-if="query" @click="clearSearch"
          class="cursor-pointer absolute right-0 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600 w-11 h-11 flex items-center justify-center"
          aria-label="Suche löschen" type="button">
          ✕
        </button>
        <ComboboxOptions
          class="absolute left-0 right-0 mt-1 bg-white border border-stone-300 rounded-lg shadow z-10 max-h-48 overflow-y-auto">
          <ComboboxOption v-for="option in suggestions" :key="option.id"
            :value="getDisplayName(option)" v-slot="{ active, selected, disabled }">
            <span :class="[
              'block px-4 py-2 cursor-pointer',
              active ? 'bg-amber-100 text-amber-700 font-semibold' : '',
              selected ? 'font-bold' : ''
            ]">
              <template v-if="getCommonName(option)">
                {{ getCommonName(option) }}
                <span class="italic text-stone-400">({{ option.name }})</span>
              </template>
              <span v-else class="italic">{{ option.name }}</span>
            </span>
          </ComboboxOption>
        </ComboboxOptions>
      </Combobox>
    </div>
    <button v-if="!compact" @click="applySearch()" class="btn btn-primary">
      Suchen
    </button>
    <button v-else @click="applySearch()"
      class="shrink-0 p-2 rounded-lg text-tan-600 hover:bg-tan-100" aria-label="Suchen" type="button">
      <SearchIcon class="w-5 h-5" />
    </button>
  </div>
</template>
