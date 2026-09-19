<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Recommendation } from '@/utils/activityPlanner'
import { formatWindow } from '@/utils/activityPlanner'
import type { Activity } from '@/utils/activityScorer'

defineProps<{ recommendations: Recommendation[] }>()
const { t } = useI18n()

const ICONS: Record<Activity, string> = { surf: '🏄', kite: '🪁', swimming: '🏊', diving: '🤿' }
// Reuses the wind intensity token pairs (AA-checked in both themes): green -> red as conditions worsen.
const BADGE = {
  great: 'bg-wind-calm text-wind-calm-fg',
  good: 'bg-wind-moderate text-wind-moderate-fg',
  fair: 'bg-wind-strong text-wind-strong-fg',
  poor: 'bg-wind-extreme text-wind-extreme-fg',
  stormy: 'bg-wind-extreme text-wind-extreme-fg',
} as const
</script>

<template>
  <div data-testid="activity-panel" class="mt-1">
    <p class="mb-0.5 text-[10px] font-normal uppercase tracking-wide text-muted">
      {{ t('activities.title') }}
    </p>
    <ul class="grid grid-cols-2 gap-x-2 gap-y-1">
      <li
        v-for="r in recommendations"
        :key="r.activity"
        data-testid="activity"
        :data-activity="r.activity"
        class="flex min-w-0 items-center gap-1 text-[11px] font-normal leading-tight"
      >
        <span data-testid="activity-icon" aria-hidden="true" class="text-sm">{{ ICONS[r.activity] }}</span>
        <span class="min-w-0">
          <span class="block truncate font-medium">{{ t(`activities.${r.activity}`) }}</span>
          <span v-if="r.label === null" class="text-muted">–</span>
          <template v-else>
            <span
              data-testid="activity-badge"
              class="inline-block rounded px-1 font-semibold"
              :class="BADGE[r.label]"
              >{{ r.label === 'stormy' ? t('activities.stormy') : t(`activities.level.${r.label}`) }}</span
            >
            <span v-if="r.start !== null && r.end !== null" class="ml-1 text-muted">{{
              formatWindow({ start: r.start, end: r.end })
            }}</span>
          </template>
        </span>
      </li>
    </ul>
  </div>
</template>
