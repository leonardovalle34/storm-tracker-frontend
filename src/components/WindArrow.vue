<script setup lang="ts">
import { computed } from 'vue'
import { arrowRotation } from '@/utils/wind'

const props = defineProps<{ direction: number }>()
const style = computed(() => ({ transform: `rotate(${arrowRotation(props.direction)}deg)` }))
</script>

<template>
  <!-- Colorless on purpose: currentColor inherits the text color of the containing cell. -->
  <svg viewBox="0 0 24 24" width="18" height="18" class="mx-auto" :style="style" aria-hidden="true">
    <path d="M12 3 L18 20 L12 16 L6 20 Z" fill="currentColor" />
  </svg>
</template>
