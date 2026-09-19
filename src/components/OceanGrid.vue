<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MarineHourly } from '@/types/weather'
import { formatDay } from '@/utils/date'
import { CELL, DAY_START, HOUR_COL_REM, HOURS_PER_DAY, LABEL_COL_REM, tableWidth } from '@/utils/gridStyles'
import { buildMarineDays, type MarineColumn } from '@/utils/hourly'
import DayHeader from './DayHeader.vue'
import TideChart from './TideChart.vue'
import WindDirection from './WindDirection.vue'

const props = defineProps<{ hourly: MarineHourly }>()
const { t, locale } = useI18n()

const days = computed(() => buildMarineDays(props.hourly))
// Wave-model reliability drops sharply after ~day 7: days 8+ are flagged, never hidden.
const LONG_TERM_FROM = 7

const columns = computed(() =>
  days.value.flatMap((d) => d.columns.map((c, i) => ({ ...c, date: d.date, first: i === 0 }))),
)
type Col = MarineColumn & { first: boolean }

const round = (v: number | null, digits: number) =>
  v === null ? '–' : (Math.round(v * 10 ** digits) / 10 ** digits).toFixed(digits)
// tide keeps up to 2 decimals without trailing zeros noise ("0.25", "1")
const tide = (v: number | null) => (v === null ? '–' : String(Math.round(v * 100) / 100))

const rows = [
  { id: 'swell', label: 'ocean.swell', text: (c: Col) => round(c.swell, 1) },
  { id: 'period', label: 'ocean.period', text: (c: Col) => round(c.period, 1) },
  { id: 'swelldir', label: 'ocean.swellDir', dir: (c: Col) => c.swellDir },
  { id: 'tide', label: 'ocean.tide', text: (c: Col) => tide(c.tide) },
  { id: 'temp', label: 'ocean.waterTemp', text: (c: Col) => round(c.waterTemp, 1) },
] as const
const label =
  'sticky left-0 z-10 border-r border-line bg-surface px-2 text-left text-xs font-normal text-muted'
</script>

<template>
  <div>
    <h2 class="mb-3 text-xl font-semibold">{{ t('ocean.title') }}</h2>
    <div data-testid="ocean-scroll" class="overflow-x-auto rounded-lg border border-line bg-surface">
      <table class="table-fixed border-collapse" :style="{ width: tableWidth(days.length) }">
        <colgroup>
          <col :style="{ width: `${LABEL_COL_REM}rem` }" />
          <col v-for="n in days.length * HOURS_PER_DAY" :key="n" :style="{ width: `${HOUR_COL_REM}rem` }" />
        </colgroup>
        <DayHeader :dates="days.map((d) => d.date)">
          <template #day="{ date, index }">
            <span class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm">
              <span class="capitalize">{{ formatDay(date, locale) }}</span>
              <span
                v-if="index >= LONG_TERM_FROM"
                data-testid="long-term"
                :title="t('ocean.longTermHint')"
                class="inline-flex items-center gap-1 rounded-full border border-line px-1.5 text-[10px] font-normal leading-4 text-muted"
              >
                <span aria-hidden="true">⏳</span>{{ t('ocean.longTerm') }}
              </span>
            </span>
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
                <TideChart :series="day.tideSeries" />
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
              class="bg-surface-2 text-ink"
              :class="[CELL, 'dir' in r && 'h-auto py-1', c.first && DAY_START]"
            >
              <WindDirection v-if="'dir' in r" :direction="r.dir(c)" />
              <template v-else>{{ r.text(c) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
