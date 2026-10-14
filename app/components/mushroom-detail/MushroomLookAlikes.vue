<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/Card.vue'
import type Shroom from '@/types/Shroom'

const props = defineProps<{
  lookAlikes: Shroom[] 
}>()

const sortedLookAlikes = computed(() => {
  return [...props.lookAlikes].sort((a, b) => (b.obs_count_ger || 0) - (a.obs_count_ger || 0))
})

// subtle warning in the header, so dangerous look-alikes are visible before scanning the cards
const dangerous = computed(() => ({
  deadly: props.lookAlikes.filter(s => s.toxicity === 'deadly').length,
  toxic: props.lookAlikes.filter(s => s.toxicity === 'toxic').length
}))
</script>

<template>
  <div v-if="lookAlikes.length" class="space-y-6 pt-10">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-serif font-bold text-tan-900">Verwechslungsgefahr</h2>
      <div class="hidden md:flex items-center gap-2">
        <span v-if="dangerous.deadly" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {{ dangerous.deadly }} tödlich giftig
        </span>
        <span v-if="dangerous.toxic" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          {{ dangerous.toxic }} giftig
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card 
        v-for="lookalike in sortedLookAlikes" 
        :key="lookalike.id" 
        :shroom="lookalike"
        always-show-status
      />
    </div>
  </div>
</template>