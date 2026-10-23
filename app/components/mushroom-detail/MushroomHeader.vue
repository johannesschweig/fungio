<script setup lang="ts">
import type Shroom from '@/types/Shroom'
import { capitalizeFirstLetter, getDisplayName } from '@/utils/utils';
import MushroomBreadcrumb from '~/components/mushroom-detail/MushroomBreadcrumb.vue'

defineProps<{ shroom: Shroom }>()
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-col gap-4">
      <MushroomBreadcrumb :ancestry="shroom.ancestry" />
      <h1 class="text-4xl md:text-5xl font-serif font-bold text-tan-900">
        {{ getDisplayName(shroom) }}
      </h1>

      <div class="flex gap-3 items-center">
        <span class="text-lg md:text-xl text-tan-500 italic font-serif">
          {{ capitalizeFirstLetter(shroom.name) }}
        </span>
        <div v-if="shroom.edibility === 'excellent' || shroom.edibility === 'good'"
          class="px-3  py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-tan-200 text-tan-800">
          Essbar
        </div>
      </div>
      <div v-if="shroom.alternative_common_names && shroom.alternative_common_names.length > 0" class="text-sm text-tan-700 mb-2">
        Auch bekannt als: {{ shroom.alternative_common_names.join(', ') }}
      </div>
    </div>
  </div>
</template>