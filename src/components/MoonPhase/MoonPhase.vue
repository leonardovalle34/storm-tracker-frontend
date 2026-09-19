<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWeatherStore } from '@/stores/weather'
import { isKnownPhase, moonIcon } from '@/utils/moon'

const props = defineProps<{ date: string }>()
const { t } = useI18n()
const weatherStore = useWeatherStore()
const { moonPhases, moonErrors } = storeToRefs(weatherStore)
const phase = computed(() => moonPhases.value[props.date] ?? null)
const invalid = computed<string | null>(() => moonErrors.value[props.date] ?? null) // backend detail of a 400 (bad date format)

watch(
  () => props.date,
  (date) => void weatherStore.loadMoonPhase(date),
  { immediate: true },
)
</script>

<template>
  <span v-if="phase" data-testid="moon-phase" class="inline-flex items-center gap-1 text-sm text-muted">
    <span aria-hidden="true">{{ moonIcon(phase.phase_name) }}</span>
    {{ isKnownPhase(phase.phase_name) ? t(`moon.${phase.phase_name}`) : phase.phase_name }}
  </span>
  <span
    v-else-if="invalid !== null"
    data-testid="moon-error"
    role="status"
    :title="invalid"
    class="text-sm text-muted"
  >
    {{ t('moon.invalidDate') }}
  </span>
</template>
