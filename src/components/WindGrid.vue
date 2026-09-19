<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSyncedScroll } from '@/composables/useSyncedScroll'
import type { HourlyForecast } from '@/types/weather'
import { formatDay } from '@/utils/date'
import {
  CELL,
  DAY_START,
  dayPitchPx,
  HOUR_COL_REM,
  HOURS_PER_DAY,
  LABEL_COL_REM,
  tableWidth,
} from '@/utils/gridStyles'
import { buildWindDays } from '@/utils/hourly'
import type { WindLevel } from '@/utils/wind'
import DayHeader from './DayHeader.vue'
import MoonPhase from './MoonPhase.vue'
import WindDirection from './WindDirection.vue'

const props = defineProps<{ hourly: HourlyForecast }>()
const { t, locale } = useI18n()

const scroller = ref<HTMLElement | null>(null)
useSyncedScroll(scroller, dayPitchPx)

// Full class strings so Tailwind can see them.
const LEVEL_CLASS: Record<WindLevel, string> = {
  calm: 'bg-wind-calm text-wind-calm-fg',
  moderate: 'bg-wind-moderate text-wind-moderate-fg',
  strong: 'bg-wind-strong text-wind-strong-fg',
  extreme: 'bg-wind-extreme text-wind-extreme-fg',
}

const days = computed(() => buildWindDays(props.hourly))
// flat column list: day boundaries are every HOURS_PER_DAY columns
const columns = computed(() =>
  days.value.flatMap((d) => d.columns.map((c, i) => ({ ...c, date: d.date, first: i === 0 }))),
)
const label =
  'sticky left-0 z-10 border-r border-line bg-surface px-2 text-left text-xs font-normal text-muted'
</script>

<template>
  <div>
    <h2 class="mb-3 text-xl font-semibold">{{ t('wind.title') }}</h2>
    <div
      ref="scroller"
      data-testid="wind-scroll"
      class="overflow-x-auto rounded-lg border border-line bg-surface"
    >
      <table class="table-fixed border-collapse" :style="{ width: tableWidth(days.length) }">
        <colgroup>
          <col :style="{ width: `${LABEL_COL_REM}rem` }" />
          <col v-for="n in days.length * HOURS_PER_DAY" :key="n" :style="{ width: `${HOUR_COL_REM}rem` }" />
        </colgroup>
        <DayHeader :dates="days.map((d) => d.date)">
          <template #day="{ date }">
            <span class="flex flex-wrap items-center justify-between gap-x-2 text-sm">
              <span class="capitalize">{{ formatDay(date, locale) }}</span>
              <MoonPhase :date="date" />
            </span>
          </template>
        </DayHeader>
        <tbody>
          <tr>
            <th scope="row" :class="label">{{ t('wind.speed') }}</th>
            <td
              v-for="c in columns"
              :key="`${c.date}-${c.hour}`"
              data-testid="speed-cell"
              :title="t(`wind.level.${c.level}`)"
              class="font-semibold"
              :class="[CELL, LEVEL_CLASS[c.level], c.first && DAY_START]"
            >
              {{ Math.round(c.knots) }}
            </td>
          </tr>
          <tr>
            <th scope="row" :class="label">{{ t('wind.direction') }}</th>
            <td
              v-for="c in columns"
              :key="`${c.date}-${c.hour}`"
              data-testid="dir-cell"
              :title="`${Math.round(c.direction)}°`"
              class="py-1"
              :class="[CELL, 'h-auto', LEVEL_CLASS[c.level], c.first && DAY_START]"
            >
              <WindDirection :direction="c.direction" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
