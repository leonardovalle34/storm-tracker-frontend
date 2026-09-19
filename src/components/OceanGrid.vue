<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MarineHourly } from '@/types/weather'
import { formatDay } from '@/utils/date'
import { buildMarineDays } from '@/utils/hourly'
import TideChart from './TideChart.vue'

const props = defineProps<{ hourly: MarineHourly }>()
const { t, locale } = useI18n()

const days = computed(() => buildMarineDays(props.hourly))
// Wave-model reliability drops sharply after ~day 7: days 8+ are flagged, never hidden.
const LONG_TERM_FROM = 7
const fmt = (v: number | null) =>
  v === null ? '–' : String(Math.round(v * 100) / 100).replace(/^(-?\d+)$/, '$1')
const fmt1 = (v: number | null) => (v === null ? '–' : (Math.round(v * 10) / 10).toFixed(1))

const rows = [
  { id: 'swell', label: 'ocean.swell', get: (c: { swell: number | null }) => fmt1(c.swell) },
  { id: 'tide', label: 'ocean.tide', get: (c: { tide: number | null }) => fmt(c.tide) },
  { id: 'temp', label: 'ocean.waterTemp', get: (c: { waterTemp: number | null }) => fmt1(c.waterTemp) },
] as const
</script>

<template>
  <div>
    <h2 class="mb-3 text-xl font-semibold">{{ t('ocean.title') }}</h2>
    <div class="space-y-4">
      <section
        v-for="(day, di) in days"
        :key="day.date"
        data-testid="ocean-day"
        class="rounded-lg border border-line bg-surface"
      >
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
          <h3 class="font-medium capitalize">{{ formatDay(day.date, locale) }}</h3>
          <span
            v-if="di >= LONG_TERM_FROM"
            data-testid="long-term"
            :title="t('ocean.longTermHint')"
            class="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-muted"
          >
            <span aria-hidden="true">⏳</span>{{ t('ocean.longTerm') }}
          </span>
        </header>
        <div data-testid="ocean-scroll" class="overflow-x-auto">
          <table class="w-full min-w-[30rem] table-fixed border-collapse text-center text-sm">
            <colgroup>
              <col class="w-28" />
              <col v-for="n in 7" :key="n" />
            </colgroup>
            <thead>
              <!-- Same 7 equal columns as the grid below, so chart axis and grid line up. -->
              <tr data-testid="tide-chart">
                <th scope="row" class="sticky left-0 bg-surface px-2 py-1 text-left font-normal text-muted">
                  {{ t('ocean.tide') }}
                </th>
                <td colspan="7" class="p-0"><TideChart :series="day.tideSeries" /></td>
              </tr>
              <tr>
                <th scope="col" class="sticky left-0 bg-surface px-2 py-1 text-left font-normal text-muted">
                  {{ t('wind.hour') }}
                </th>
                <th
                  v-for="c in day.columns"
                  :key="c.hour"
                  scope="col"
                  data-testid="hour-head"
                  class="px-2 py-1 font-medium"
                >
                  {{ c.hour }}h
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id" class="border-t border-line">
                <th
                  scope="row"
                  class="sticky left-0 whitespace-nowrap bg-surface px-2 py-1 text-left font-normal text-muted"
                >
                  {{ t(r.label) }}
                </th>
                <td v-for="c in day.columns" :key="c.hour" :data-testid="`${r.id}-cell`" class="px-2 py-1.5">
                  {{ r.get(c as never) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
