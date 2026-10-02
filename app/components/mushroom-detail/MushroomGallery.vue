<script setup lang="ts">
import { ref, computed } from 'vue'
import VueEasyLightbox from 'vue-easy-lightbox'
import MushroomImage from '@/components/MushroomImage.vue'
import { getInaturalistImageUrl } from '@/utils/utils' // Pfad ggf. anpassen
import type Shroom from '@/types/Shroom'

const props = defineProps<{
  photos: NonNullable<Shroom['photos']>
}>()

const lightboxVisible = ref(false)
const currentIndex = ref(0)

const images = computed(() =>
  props.photos.map(p => ({
    src: getInaturalistImageUrl(p.url, "medium"),
    title: p.attribution || ''
  }))
)

function openLightbox(index: number) {
  currentIndex.value = index
  lightboxVisible.value = true
}
</script>

<template>
  <div class="w-full h-full">
    <VueEasyLightbox
      :visible="lightboxVisible"
      :imgs="images"
      :index="currentIndex"
      @hide="lightboxVisible = false"
    />

    <div class="flex md:hidden overflow-x-auto gap-3 pb-4 -mx-4 px-4 snap-x">
      <div 
        v-for="(photo, index) in photos" 
        :key="index"
        class="shrink-0 w-72 h-56 snap-center"
      >
        <MushroomImage
          :shroom="{ photos: [photo] } as any"
          :index="0"
          :priority="index === 0"
          class="w-full h-full object-cover rounded-xl shadow-sm border border-tan-100"
          @click="openLightbox(index)"
        />
      </div>
    </div>

    <div class="hidden md:grid grid-cols-3 gap-4">
      <div class="col-span-2 h-full">
        <MushroomImage
          :shroom="{ photos: [props.photos[0]] } as any"
          :index="0"
          priority
          class="w-full h-full object-cover rounded-2xl shadow-sm cursor-pointer hover:opacity-95 transition-opacity border border-tan-100"
          @click="openLightbox(0)"
        />
      </div>

      <div class="flex flex-col gap-4 h-full">
        <div v-if="photos[1]" class="h-1/2">
          <MushroomImage
            :shroom="{ photos: [props.photos[1]] } as any"
            :index="0"
            class="w-full h-full object-cover rounded-2xl shadow-sm cursor-pointer hover:opacity-95 transition-opacity border border-tan-100"
            @click="openLightbox(1)"
          />
        </div>
        
        <div v-if="photos[2]" class="h-1/2 relative">
          <MushroomImage
            :shroom="{ photos: [props.photos[2]] } as any"
            :index="0"
            class="w-full h-full object-cover rounded-2xl shadow-sm cursor-pointer hover:opacity-95 transition-opacity border border-tan-100"
            @click="openLightbox(2)"
          />
          <div 
            v-if="photos.length > 3"
            class="absolute inset-0 bg-tan-950/40 rounded-2xl flex items-center justify-center cursor-pointer backdrop-blur-[2px] hover:bg-tan-950/30 transition-colors"
            @click="openLightbox(2)"
          >
            <span class="text-white font-bold text-xl">+{{ photos.length - 3 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>