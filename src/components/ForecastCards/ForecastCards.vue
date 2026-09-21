<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SyncToggle from '@/components/SyncToggle/SyncToggle.vue'
import { useSyncedScroll } from '@/composables/useSyncedScroll'
import AlertIcon from '@/components/AlertIcon/AlertIcon.vue'
import { useUnitsStore } from '@/stores/units'
import { formatTemp } from '@/utils/temperature'
import type { DailyForecast, HourlyForecast, MarineHourly } from '@/types/weather'
import { WARNING_DAYS, buildDayAlerts, upcomingWarnings, worstSeverity, type Severity } from '@/utils/alerts'
import { TONE_CLASS } from '@/utils/tones'
import { formatDay } from '@/utils/date'
import { describeWeather } from '@/utils/weatherCode'
import ConditionBadge from '@/components/ConditionBadge/ConditionBadge.vue'
import DayDetailModal from '@/components/DayDetailModal/DayDetailModal.vue'

const props = defineProps<{
  daily: DailyForecast
  /** for the wind alert (sustained wind and gusts) */
  hourly?: Pick<
    HourlyForecast,
    'time' | 'wind_speed_10m' | 'wind_gusts_10m' | 'temperature_2m' | 'weather_code'
  > | null
  /** only when the location has ocean data: turns on the sea alert */
  marine?: MarineHourly | null
}>()
const { t, locale } = useI18n()
const { temperature: unit } = storeToRefs(useUnitsStore())

const scroller = ref<HTMLElement | null>(null)
// one card + gap in px (measured; 124 = w-28 + gap-3 when there is no layout)
useSyncedScroll(scroller, () => {
  const [a, b] = Array.from(scroller.value?.children ?? []) as HTMLElement[]
  const measured = a && b ? b.offsetLeft - a.offsetLeft : 0
  return measured > 0 ? measured : 124
})

// day whose detail modal is open (index in daily.time); null = closed
const openDay = ref<number | null>(null)

const dayAlerts = computed(() => buildDayAlerts(props))
const warnings = computed(() => upcomingWarnings(dayAlerts.value))
const bannerTone = computed(() => {
  const worst = warnings.value.reduce<Severity>((w, a) => worstSeverity(w, a.severity), 'none')
  return TONE_CLASS[worst === 'severe' ? 'bad' : 'warn']
})

const cards = computed(() =>
  props.daily.time.map((date, i) => ({
    alerts: dayAlerts.value[i].alerts,
    date,
    label: formatDay(date, locale.value),
    max: formatTemp(props.daily.temperature_2m_max[i], unit.value, 0, false),
    min: formatTemp(props.daily.temperature_2m_min[i], unit.value, 0, false),
    rain: props.daily.precipitation_sum[i] ?? 0,
    weather: describeWeather(props.daily.weather_code?.[i]),
    uv: props.daily.uv_index_max?.[i] ?? null,
  })),
)
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-xl font-semibold">{{ t('forecast.title') }}</h2>
      <SyncToggle />
    </div>
    <div
      v-if="warnings.length"
      data-testid="alert-banner"
      role="status"
      class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-sm"
      :class="bannerTone"
    >
      <strong>{{ t('alerts.banner', { days: WARNING_DAYS }) }}:</strong>
      <span
        v-for="w in warnings"
        :key="w.category"
        class="inline-flex items-center gap-1"
        data-testid="banner-item"
      >
        <AlertIcon :category="w.category" :severity="w.severity" />
        {{ t(`alerts.category.${w.category}`) }} ({{ t(`alerts.severity.${w.severity}`) }}) ·
        <span class="font-semibold capitalize" data-testid="banner-days">{{
          w.dates.map((d) => formatDay(d, locale)).join(', ')
        }}</span>
      </span>
      <span class="text-xs opacity-90">{{ t('alerts.bannerNote') }}</span>
    </div>
    <div ref="scroller" data-testid="day-cards" class="flex gap-3 overflow-x-auto pb-2">
      <button
        v-for="(c, i) in cards"
        :key="c.date"
        type="button"
        data-testid="day-card"
        class="flex w-28 shrink-0 cursor-pointer flex-col items-center gap-1 rounded-lg border border-line bg-surface p-3 text-center hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
        @click="openDay = i"
      >
        <span class="block text-sm font-medium capitalize">{{ c.label }}</span>
        <span
          data-testid="weather-icon"
          role="img"
          :aria-label="t(`weather.${c.weather.key}`)"
          :title="t(`weather.${c.weather.key}`)"
          class="text-3xl"
          >{{ c.weather.icon }}</span
        >
        <span class="block text-base font-semibold">
          {{ c.max }} <span class="font-normal text-muted">{{ c.min }}</span>
        </span>
        <span class="block text-xs text-muted" :title="t('forecast.precipitation')">💧 {{ c.rain }} mm</span>
        <span v-if="c.uv !== null" data-testid="uv" class="mt-0.5 block"
          ><ConditionBadge kind="uv" :value="c.uv"
        /></span>
        <!-- only days with something active get the row; quiet days stay clean -->
        <div
          v-if="c.alerts.length"
          data-testid="alert-row"
          class="mt-0.5 flex flex-wrap justify-center gap-1"
        >
          <AlertIcon v-for="a in c.alerts" :key="a.category" :category="a.category" :severity="a.severity" />
        </div>
      </button>
    </div>
    <DayDetailModal v-model:index="openDay" :daily="daily" :hourly="hourly" />
  </div>
</template>
