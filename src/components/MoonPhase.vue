<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchMoonPhase } from '@/services/api'
import type { MoonPhase } from '@/types/weather'
import { isKnownPhase, moonIcon } from '@/utils/moon'

const props = defineProps<{ date: string }>()
const { t } = useI18n()
const phase = ref<MoonPhase | null>(null)

watch(
  () => props.date,
  async (date) => {
    phase.value = null
    try {
      const p = await fetchMoonPhase(date)
      if (date === props.date) phase.value = p
    } catch {
      /* moon phase is a nicety: hide it on failure */
    }
  },
  { immediate: true },
)
</script>

<template>
  <span v-if="phase" data-testid="moon-phase" class="inline-flex items-center gap-1 text-sm text-muted">
    <span aria-hidden="true">{{ moonIcon(phase.phase_name) }}</span>
    {{ isKnownPhase(phase.phase_name) ? t(`moon.${phase.phase_name}`) : phase.phase_name }}
  </span>
</template>
