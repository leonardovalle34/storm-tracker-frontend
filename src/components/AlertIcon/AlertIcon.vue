<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ActiveSeverity, AlertCategory } from '@/utils/alerts'
import { useUnitsStore } from '@/stores/units'
import { formatTemp } from '@/utils/temperature'
import { toWindUnit } from '@/utils/wind'
import { TONE_CLASS, type Tone } from '@/utils/tones'

const props = defineProps<{ category: AlertCategory; severity: ActiveSeverity }>()
const { t } = useI18n()
const { temperature: unit, windUnit } = storeToRefs(useUnitsStore())

const ICON: Record<AlertCategory, string> = {
  rain: '🌧️',
  snow: '❄️',
  heat: '🌡️',
  wind: '💨',
  storm: '⛈️',
  sea: '🌊',
}
// yellow / orange / red
const TONE: Record<ActiveSeverity, Tone> = { moderate: 'ok', high: 'warn', severe: 'bad' }

/** Category and level, what it means, and always that this is a model estimate, not an official alert. */
const description = computed(() => {
  const { category, severity } = props
  // heat limits (°C) shown in the unit the user chose
  const limits = {
    a: formatTemp(33, unit.value),
    b: formatTemp(38, unit.value),
    c: formatTemp(44, unit.value),
  }
  // the wind thresholds are defined in km/h (see alerts.ts); shown in the chosen unit
  const kmh = (v: number) => String(Math.round(toWindUnit(v / 1.852, windUnit.value)))
  const wind = {
    v40: kmh(40),
    v50: kmh(50),
    v60: kmh(60),
    v100: kmh(100),
    u: windUnit.value === 'km/h' ? 'km/h' : 'kt',
  }
  return [
    `${t(`alerts.category.${category}`)} (${t(`alerts.severity.${severity}`)})`,
    t(`alerts.text.${category}.${severity}`, { ...limits, ...wind }),
    t(`alerts.disclaimer.${category === 'sea' ? 'sea' : 'land'}`),
  ].join(' — ')
})
</script>

<template>
  <span
    data-testid="alert-icon"
    role="img"
    :data-category="category"
    :data-severity="severity"
    :aria-label="description"
    :title="description"
    class="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm"
    :class="TONE_CLASS[TONE[severity]]"
    >{{ ICON[category] }}</span
  >
</template>
