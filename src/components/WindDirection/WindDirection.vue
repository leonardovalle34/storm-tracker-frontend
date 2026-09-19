<script setup lang="ts">
import { cardinal } from '@/utils/wind'
import WindArrow from '@/components/WindArrow/WindArrow.vue'

// Arrow + compass letters from a bearing in degrees. Color comes from the containing cell.
defineProps<{ direction: number | null }>()
</script>

<template>
  <span v-if="direction !== null" class="flex flex-col items-center leading-none">
    <WindArrow :direction="direction" />
    <span data-testid="cardinal" class="mt-0.5 text-[10px] font-semibold">{{ cardinal(direction) }}</span>
  </span>
  <span v-else>–</span>
</template>
