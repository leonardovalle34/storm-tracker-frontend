<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ActiveSeverity, AlertCategory } from '@/utils/alerts'
import { TONE_CLASS, type Tone } from '@/utils/tones'

const props = defineProps<{ category: AlertCategory; severity: ActiveSeverity }>()
const { t } = useI18n()

const ICON: Record<AlertCategory, string> = { rain: '🌧️', snow: '❄️', wind: '💨', storm: '⛈️', sea: '🌊' }
// yellow / orange / red
const TONE: Record<ActiveSeverity, Tone> = { moderate: 'ok', high: 'warn', severe: 'bad' }

/** Category and level, what it means, and always that this is a model estimate, not an official alert. */
const description = computed(() => {
  const { category, severity } = props
  return [
    `${t(`alerts.category.${category}`)} (${t(`alerts.severity.${severity}`)})`,
    t(`alerts.text.${category}.${severity}`),
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
