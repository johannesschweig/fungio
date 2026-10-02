<script setup lang="ts">
import { ref } from 'vue'
import type Shroom from '@/types/Shroom'
import type { PropType } from 'vue'

const props = defineProps({
  shroom: {
    type: Object as PropType<Shroom>,
    required: true
  },
  index: {
    type: Number,
    default: 0
  },
  moreImages: {
    type: Number,
    default: 0
  },
  // first/largest image above the fold (usually the LCP element): load it right away instead of lazily
  priority: {
    type: Boolean,
    default: false
  }
})
const showAttribution = ref(false)
const photo = props.shroom.photos ? props.shroom.photos[props.index] : { 'url': '', 'attribution': '', 'license_code': '' }
</script>

<template>
  <div class="relative rounded-lg shadow-md md:aspect-[3/2] overflow-hidden cursor-pointer md:border-2 md:border-transparent md:hover:border-amber-600">
    <!-- Mushroom image -->
    <img
      :src="getInaturalistImageUrl(photo.url, 'medium')"
      :alt="shroom.preferred_common_name"
      class="w-full h-full object-cover"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
    />
    <div v-if="moreImages > 0" class="absolute bottom-0 right-0 bg-stone-800 text-white p-2 rounded-br-lg rounded-tl-lg text-sm">
      +{{ moreImages }}
    </div>
    <!-- CC icon button bottom-left -->
    <button
      v-if="!showAttribution && photo.license_code != 'cc0'"
      @click.stop="showAttribution = true"
      class="absolute bottom-2 left-2 bg-white opacity-70 rounded-full p-1 hover:opacity-100 transition text-xs cursor-pointer z-10"
      title="Show attribution"
      aria-label="Toggle attribution"
    >
      CC
    </button>
    <!-- Attribution small bottom bar -->
    <transition name="fade">
      <div
        v-if="showAttribution && photo.attribution"
        @click.stop="showAttribution = false"
        class="absolute bottom-0 left-0 bg-[rgba(0,0,0,0.7)]  text-white min-h-8 min-w-full flex flex-wrap items-center px-2 py-2 text-xs cursor-pointer z-20"
      >
        {{ photo.attribution }}
      </div>
    </transition>
  </div>
</template>