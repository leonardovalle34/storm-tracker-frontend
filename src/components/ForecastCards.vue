<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DailyForecast } from '@/types/weather'
import { formatDay } from '@/utils/date'
import { describeWeather } from '@/utils/weatherCode'

const props = defineProps<{ daily: DailyForecast }>()
const { t, locale } = useI18n()

const cards = computed(() =>
  props.daily.time.map((date, i) => ({
    date,
    label: formatDay(date, locale.value),
    max: Math.round(props.daily.temperature_2m_max[i]),
    min: Math.round(props.daily.temperature_2m_min[i]),
    rain: props.daily.precipitation_sum[i] ?? 0,
    weather: describeWeather(props.daily.weather_code?.[i], props.daily.precipitation_sum[i]),
  })),
)
</script>

<template>
  <div>
    <h2 class="mb-3 text-xl font-semibold">{{ t('forecast.title') }}</h2>
    <div data-testid="day-cards" class="flex gap-3 overflow-x-auto pb-2">
      <article
        v-for="c in cards"
        :key="c.date"
        data-testid="day-card"
        class="flex w-28 shrink-0 flex-col items-center gap-1 rounded-lg border border-line bg-surface p-3 text-center"
      >
        <p class="text-sm font-medium capitalize">{{ c.label }}</p>
        <span
          data-testid="weather-icon"
          role="img"
          :aria-label="t(`weather.${c.weather.key}`)"
          :title="t(`weather.${c.weather.key}`)"
          class="text-3xl"
          >{{ c.weather.icon }}</span
        >
        <p class="text-base font-semibold">
          {{ c.max }}° <span class="font-normal text-muted">{{ c.min }}°</span>
        </p>
        <p class="text-xs text-muted" :title="t('forecast.precipitation')">💧 {{ c.rain }} mm</p>
      </article>
    </div>
  </div>
</template>
