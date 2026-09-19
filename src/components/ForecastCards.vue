<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSyncedScroll } from '@/composables/useSyncedScroll'
import type { DailyForecast } from '@/types/weather'
import { formatDay } from '@/utils/date'
import { describeWeather } from '@/utils/weatherCode'
import ConditionBadge from './ConditionBadge.vue'

const props = defineProps<{ daily: DailyForecast }>()
const { t, locale } = useI18n()

const scroller = ref<HTMLElement | null>(null)
// one card + gap in px (measured; 124 = w-28 + gap-3 when there is no layout)
useSyncedScroll(scroller, () => {
  const [a, b] = Array.from(scroller.value?.children ?? []) as HTMLElement[]
  const measured = a && b ? b.offsetLeft - a.offsetLeft : 0
  return measured > 0 ? measured : 124
})

const cards = computed(() =>
  props.daily.time.map((date, i) => ({
    date,
    label: formatDay(date, locale.value),
    max: Math.round(props.daily.temperature_2m_max[i]),
    min: Math.round(props.daily.temperature_2m_min[i]),
    rain: props.daily.precipitation_sum[i] ?? 0,
    weather: describeWeather(props.daily.weather_code?.[i]),
    uv: props.daily.uv_index_max?.[i] ?? null,
  })),
)
</script>

<template>
  <div>
    <h2 class="mb-3 text-xl font-semibold">{{ t('forecast.title') }}</h2>
    <div ref="scroller" data-testid="day-cards" class="flex gap-3 overflow-x-auto pb-2">
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
        <p v-if="c.uv !== null" data-testid="uv" class="mt-0.5"><ConditionBadge kind="uv" :value="c.uv" /></p>
      </article>
    </div>
  </div>
</template>
