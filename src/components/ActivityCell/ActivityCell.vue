<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatWindow, type Recommendation } from '@/utils/activityPlanner'
import { TONE_CLASS, type Tone } from '@/utils/tones'

defineProps<{ recommendation: Recommendation }>()
const { t } = useI18n()

const TONE = {
  great: 'good',
  good: 'ok',
  fair: 'warn',
  poor: 'bad',
  stormy: 'bad',
} as const satisfies Record<string, Tone>
</script>

<template>
  <span v-if="recommendation.label === null" class="text-muted">–</span>
  <span v-else class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
    <span
      data-testid="activity-badge"
      class="rounded px-1.5 py-0.5 text-xs font-semibold leading-tight"
      :class="TONE_CLASS[TONE[recommendation.label]]"
      >{{
        recommendation.label === 'stormy'
          ? t('activities.stormy')
          : t(`activities.level.${recommendation.label}`)
      }}</span
    >
    <span v-if="recommendation.start !== null && recommendation.end !== null" class="text-xs text-muted">{{
      formatWindow({ start: recommendation.start, end: recommendation.end })
    }}</span>
  </span>
</template>
