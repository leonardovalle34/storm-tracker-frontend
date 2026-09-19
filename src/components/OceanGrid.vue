<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSyncedScroll } from '@/composables/useSyncedScroll'
import type { ForecastResponse, MarineHourly } from '@/types/weather'
import { planDays, type Recommendation } from '@/utils/activityPlanner'
import { ACTIVITIES } from '@/utils/activityScorer'
import { clarityByDay } from '@/utils/waterClarity'
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
import { buildMarineDays, firstGapIndex, type MarineColumn } from '@/utils/hourly'
import ActivityCell from './ActivityCell.vue'
import ConditionBadge from './ConditionBadge.vue'
import DayHeader from './DayHeader.vue'
import MoonPhase from './MoonPhase.vue'
import TideChart from './TideChart.vue'
import WindDirection from './WindDirection.vue'

const props = defineProps<{ hourly: MarineHourly; forecast?: ForecastResponse | null }>()
const { t, locale } = useI18n()

const scroller = ref<HTMLElement | null>(null)
useSyncedScroll(scroller, dayPitchPx)

const days = computed(() => buildMarineDays(props.hourly))
// Every day of the response is drawn. Wave-model data thins out with distance, and where it ends varies
// per location, so days from the first one with a null onward are flagged (never hidden).
// Rule-based activity recommendations per day (needs wind from the forecast plus the marine data).
const plans = computed(() =>
  props.forecast ? planDays(props.forecast, { hourly: props.hourly }) : new Map(),
)
const clarity = computed(() =>
  props.forecast ? clarityByDay(props.forecast, { hourly: props.hourly }) : new Map(),
)
const ICONS = { surf: '🏄', kite: '🪁', swimming: '🏊', diving: '🤿' } as const
const gapFrom = computed(() => firstGapIndex(days.value))
const isLongTerm = (i: number) => gapFrom.value !== -1 && i >= gapFrom.value

const columns = computed(() =>
  days.value.flatMap((d) => d.columns.map((c, i) => ({ ...c, date: d.date, first: i === 0 }))),
)
type Col = MarineColumn & { first: boolean }

const fixed = (digits: number) => (v: number) => (Math.round(v * 10 ** digits) / 10 ** digits).toFixed(digits)
// tide keeps up to 2 decimals without trailing zeros noise ("0.25", "1")
const tideFmt = (v: number) => String(Math.round(v * 100) / 100)

interface Row {
  id: string
  label: string
  value: (c: Col) => number | null
  bold?: boolean
  fmt?: (v: number) => string // absent => direction cell (arrow + cardinal)
}
const rows: Row[] = [
  { id: 'swell', label: 'ocean.swell', value: (c) => c.swell, fmt: fixed(1), bold: true },
  { id: 'period', label: 'ocean.period', value: (c) => c.period, fmt: fixed(1) },
  { id: 'swelldir', label: 'ocean.swellDir', value: (c) => c.swellDir },
  { id: 'tide', label: 'ocean.tide', value: (c) => c.tide, fmt: tideFmt },
  { id: 'temp', label: 'ocean.waterTemp', value: (c) => c.waterTemp, fmt: fixed(1) },
]
const label =
  'sticky left-0 z-10 border-r border-line bg-surface px-2 text-left text-xs font-normal text-muted'
</script>

<template>
  <div>
    <h2 class="mb-3 text-xl font-semibold">{{ t('ocean.title') }}</h2>
    <div
      ref="scroller"
      data-testid="ocean-scroll"
      class="overflow-x-auto rounded-lg border border-line bg-surface"
    >
      <table class="table-fixed border-collapse" :style="{ width: tableWidth(days.length) }">
        <colgroup>
          <col :style="{ width: `${LABEL_COL_REM}rem` }" />
          <col v-for="n in days.length * HOURS_PER_DAY" :key="n" :style="{ width: `${HOUR_COL_REM}rem` }" />
        </colgroup>
        <DayHeader :dates="days.map((d) => d.date)">
          <template #day="{ date, index }">
            <span class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm">
              <span class="capitalize">{{ formatDay(date, locale) }}</span>
              <MoonPhase :date="date" />
              <span
                v-if="isLongTerm(index)"
                data-testid="long-term"
                :title="t('ocean.longTermHint')"
                class="inline-flex items-center gap-1 rounded-full border border-line px-1.5 text-[10px] font-normal leading-4 text-muted"
              >
                <span aria-hidden="true">⏳</span>{{ t('ocean.longTerm') }}
              </span>
            </span>
            <ActivityPanel
              v-if="days[index].hasData && plans.get(date)"
              :recommendations="plans.get(date)!"
            />
          </template>
          <template #between>
            <!-- One tide curve per day, spanning that day's 7 columns, right above the hourly rows -->
            <tr>
              <th :class="label" scope="row">{{ t('ocean.tideChart') }}</th>
              <td
                v-for="day in days"
                :key="day.date"
                :colspan="HOURS_PER_DAY"
                data-testid="tide-chart"
                class="p-0"
                :class="DAY_START"
              >
                <TideChart v-if="day.hasData" :series="day.tideSeries" />
                <p v-else data-testid="no-data" class="py-6 text-center text-xs text-muted">
                  {{ t('ocean.noData') }}
                </p>
              </td>
            </tr>
          </template>
        </DayHeader>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <th scope="row" :class="label">{{ t(r.label) }}</th>
            <td
              v-for="c in columns"
              :key="`${c.date}-${c.hour}`"
              :data-testid="`${r.id}-cell`"
              :title="r.value(c) === null ? t('ocean.noDataCell') : undefined"
              class="bg-surface-2 text-ink"
              :class="[CELL, !r.fmt && 'h-auto py-1', r.bold && 'font-bold', c.first && DAY_START]"
            >
              <WindDirection v-if="!r.fmt" :direction="r.value(c)" />
              <template v-else>{{ r.value(c) === null ? '–' : r.fmt(r.value(c)!) }}</template>
            </td>
          </tr>
          <template v-if="forecast">
            <!-- Day summary below the data: one full-width (7 column) cell per day -->

            <tr data-testid="clarity-row" class="border-t border-line">
              <th scope="row" :class="label">🤿 {{ t('clarity.label') }}</th>
              <td
                v-for="day in days"
                :key="day.date"
                :colspan="HOURS_PER_DAY"
                data-testid="clarity-cell"
                class="px-2 py-1"
                :class="DAY_START"
              >
                <ConditionBadge
                  v-if="clarity.get(day.date)"
                  kind="clarity"
                  :value="clarity.get(day.date)!.score"
                />
                <span v-else class="text-muted">–</span>
              </td>
            </tr>
            <tr>
              <td :colspan="1 + days.length * HOURS_PER_DAY" class="border-t border-line bg-surface-2 p-0">
                <div
                  class="sticky left-0 w-max px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted"
                >
                  {{ t('activities.title') }}
                </div>
              </td>
            </tr>
            <tr
              v-for="a in ACTIVITIES"
              :key="a"
              data-testid="activity-row"
              :data-activity="a"
              class="border-t border-line"
            >
              <th scope="row" :class="label">{{ ICONS[a] }} {{ t(`activities.${a}`) }}</th>
              <td
                v-for="day in days"
                :key="day.date"
                :colspan="HOURS_PER_DAY"
                data-testid="activity-cell"
                class="px-2 py-1"
                :class="DAY_START"
              >
                <ActivityCell
                  v-if="day.hasData && plans.get(day.date)"
                  :recommendation="plans.get(day.date)!.find((r: Recommendation) => r.activity === a)!"
                />
                <span v-else class="text-muted">–</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
