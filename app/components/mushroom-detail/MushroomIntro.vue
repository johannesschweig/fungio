<script setup lang="ts">
import { computed } from 'vue'
import { getSeasonText, getFrequencyLabel, getDisplayName } from '@/utils/utils'
import type Shroom from '@/types/Shroom'
import { capitalizeFirstLetter } from '@/utils/utils';

const props = defineProps<{ shroom: Shroom }>()

const introText = computed(() => {
  const s = props.shroom
  const name = getDisplayName(s)

  const seasonText = getSeasonText(s.season_from, s.season_to)
  // how likely you are to actually encounter this species — more useful and reads
  // better than the coarse habitat category (wood/soil/meadow) it replaced here
  const frequency = getFrequencyLabel(s.obs_count_ger).toLowerCase()

  const whereWhen = seasonText
    ? `, der ${seasonText} ${frequency} vorkommt`
    : `, der ${frequency} vorkommt`

  return { name, whereWhen }
})
</script>

<template>
  <div class="max-w-none">
    <p class="text-tan-900 leading-relaxed text-lg">
      Der <strong>{{ introText.name }}</strong> (<em>{{ capitalizeFirstLetter(shroom.name) }}</em>) ist
      <span v-if="shroom.toxicity" class="text-red-800 font-medium">ein
        {{ shroom.toxicity === 'deadly' ? 'tödlich giftiger' : 'giftiger' }} Pilz</span>
      <span v-else-if="shroom.edibility === 'inedible'">ein ungenießbarer Pilz</span>
      <span v-else-if="shroom.edibility">ein Speisepilz mit dem Speisewert <strong>{{ $t(shroom.edibility) }}</strong></span>
      <span v-else>ein Pilz</span>{{ introText.whereWhen }}.
    </p>
  </div>
</template>
