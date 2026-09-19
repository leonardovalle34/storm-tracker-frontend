<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HourlyForecast } from '@/types/weather'
import { formatDay } from '@/utils/date'
import { buildWindDays } from '@/utils/hourly'
import type { WindLevel } from '@/utils/wind'
import MoonPhase from './MoonPhase.vue'
import WindArrow from './WindArrow.vue'

const props = defineProps<{ hourly: HourlyForecast }>()
const { t, locale } = useI18n()

// Full class strings so Tailwind can see them.
const LEVEL_CLASS: Record<WindLevel, string> = {
  calm: 'bg-wind-calm text-wind-calm-fg',
  moderate: 'bg-wind-moderate text-wind-moderate-fg',
  strong: 'bg-wind-strong text-wind-strong-fg',
  extreme: 'bg-wind-extreme text-wind-extreme-fg',
}

const days = computed(() => buildWindDays(props.hourly))
</script>

<template>
  <div>
    <h2 class="mb-3 text-xl font-semibold">{{ t('wind.title') }}</h2>
    <div class="space-y-4">
      <section v-for="day in days" :key="day.date" data-testid="wind-day" class="rounded-lg border border-line bg-surface">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
          <h3 class="font-medium capitalize">{{ formatDay(day.date, locale) }}</h3>
          <MoonPhase :date="day.date" />
        </header>
        <div data-testid="wind-scroll" class="overflow-x-auto">
          <table class="w-full min-w-[30rem] border-collapse text-center text-sm">
            <thead>
              <tr>
                <th scope="col" class="sticky left-0 bg-surface px-2 py-1 text-left font-normal text-muted">{{ t('wind.hour') }}</th>
                <th v-for="c in day.columns" :key="c.hour" scope="col" data-testid="hour-head" class="px-2 py-1 font-medium">{{ c.hour }}h</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" class="sticky left-0 bg-surface px-2 py-1 text-left font-normal text-muted">{{ t('wind.speed') }}</th>
                <td
                  v-for="c in day.columns"
                  :key="c.hour"
                  data-testid="speed-cell"
                  :title="t(`wind.level.${c.level}`)"
                  class="px-2 py-1.5 font-semibold"
                  :class="LEVEL_CLASS[c.level]"
                >
                  {{ Math.round(c.knots) }}
                </td>
              </tr>
              <tr>
                <th scope="row" class="sticky left-0 bg-surface px-2 py-1 text-left font-normal text-muted">{{ t('wind.direction') }}</th>
                <td
                  v-for="c in day.columns"
                  :key="c.hour"
                  data-testid="dir-cell"
                  :title="`${Math.round(c.direction)}°`"
                  class="px-2 py-1.5"
                  :class="LEVEL_CLASS[c.level]"
                >
                  <WindArrow :direction="c.direction" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
