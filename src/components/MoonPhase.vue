<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, fetchMoonPhase } from '@/services/api'
import type { MoonPhase } from '@/types/weather'
import { isKnownPhase, moonIcon } from '@/utils/moon'

const props = defineProps<{ date: string }>()
const { t } = useI18n()
const phase = ref<MoonPhase | null>(null)
const invalid = ref<string | null>(null) // backend detail of a 400 (bad date format)

watch(
  () => props.date,
  async (date) => {
    phase.value = null
    invalid.value = null
    try {
      const p = await fetchMoonPhase(date)
      if (date === props.date) phase.value = p
    } catch (e) {
      if (date !== props.date) return
      // A 400 is shown inline; any other failure just hides this optional indicator.
      if (e instanceof ApiError && e.status === 400) invalid.value = e.detail ?? ''
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
  <span v-else-if="invalid !== null" data-testid="moon-error" role="status" :title="invalid" class="text-sm text-muted">
    {{ t('moon.invalidDate') }}
  </span>
</template>
