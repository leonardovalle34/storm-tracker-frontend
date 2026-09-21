<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HourlyTempChart from '@/components/HourlyTempChart/HourlyTempChart.vue'
import { useLocationStore } from '@/stores/location'
import { useUnitsStore } from '@/stores/units'
import { useWeatherStore } from '@/stores/weather'
import type { DailyForecast, HourlyForecast } from '@/types/weather'
import { formatDay } from '@/utils/date'
import { buildDayHours } from '@/utils/dayHours'
import { formatTemp } from '@/utils/temperature'
import { describeWeather } from '@/utils/weatherCode'

const props = defineProps<{
  daily: DailyForecast
  hourly?: Pick<HourlyForecast, 'time' | 'temperature_2m' | 'weather_code'> | null
  /** index of the open day in `daily`; null = closed */
  index: number | null
}>()
const emit = defineEmits<{ 'update:index': [index: number | null] }>()
const { t, locale } = useI18n()
const { location } = storeToRefs(useLocationStore())
const { forecast } = storeToRefs(useWeatherStore())
const { temperature: unit } = storeToRefs(useUnitsStore())

const dialog = ref<HTMLDialogElement>()
const last = computed(() => props.daily.time.length - 1)

function sync() {
  const d = dialog.value
  if (!d) return
  if (props.index !== null && !d.open) d.showModal()
  else if (props.index === null && d.open) d.close()
}
onMounted(sync)
watch(() => props.index, sync, { flush: 'post' })

const day = computed(() => {
  const i = props.index
  if (i === null || !props.daily.time[i]) return null
  const date = props.daily.time[i]
  return {
    date,
    label: formatDay(date, locale.value),
    weather: describeWeather(props.daily.weather_code?.[i]),
    max: formatTemp(props.daily.temperature_2m_max[i], unit.value, 0, false),
    min: formatTemp(props.daily.temperature_2m_min[i], unit.value, 0, false),
    hours: props.hourly ? buildDayHours(props.hourly, date, props.daily.weather_code?.[i]) : [],
  }
})
// the first day is today: show the current temperature when the backend sent it
const current = computed(() => {
  const c = props.index === 0 ? forecast.value?.current?.temperature_2m : null
  return c == null ? null : formatTemp(c, unit.value)
})
const hasHourly = computed(() => (day.value?.hours.filter((h) => h.temp !== null).length ?? 0) >= 2)
const place = computed(() => location.value?.name ?? '')

const go = (delta: number) => {
  const next = (props.index ?? 0) + delta
  if (next >= 0 && next <= last.value) emit('update:index', next)
}
function close() {
  dialog.value?.close()
}
// also fires for Esc (the browser closes the dialog itself)
function onClose() {
  if (props.index !== null) emit('update:index', null)
}
function onBackdrop(e: MouseEvent) {
  if (e.target === dialog.value) close()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto max-h-[92vh] w-[95vw] max-w-5xl overflow-y-auto rounded-lg bg-surface p-0 text-ink backdrop:bg-black/70"
    :aria-label="day ? `${place} — ${day.label}` : t('forecast.title')"
    @click="onBackdrop"
    @close="onClose"
    @keydown="onKey"
  >
    <div v-if="day" class="relative flex items-stretch">
      <!-- pinned to the top-right corner of the dialog, on every screen size -->
      <button
        type="button"
        data-testid="day-close"
        :aria-label="t('forecast.day.close')"
        :title="t('forecast.day.close')"
        class="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-line text-xl leading-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
        @click="close"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <button
        type="button"
        data-testid="day-prev"
        :aria-label="t('forecast.day.prev')"
        :disabled="index === 0"
        class="w-8 shrink-0 text-lg hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent sm:w-10 sm:text-xl"
        @click="go(-1)"
      >
        ◀
      </button>
      <div class="min-w-0 flex-1 p-3 sm:p-4">
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 data-testid="day-place" class="text-lg font-semibold">{{ place }}</h3>
            <p data-testid="day-date" class="capitalize text-muted">{{ day.label }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span
              data-testid="day-weather"
              role="img"
              :aria-label="t(`weather.${day.weather.key}`)"
              :title="t(`weather.${day.weather.key}`)"
              class="text-4xl"
              >{{ day.weather.icon }}</span
            >
            <div class="text-right">
              <p v-if="current" data-testid="day-current" class="text-3xl font-semibold">{{ current }}</p>
              <p data-testid="day-temps" :class="current ? 'text-sm' : 'text-2xl font-semibold'">
                {{ day.max }} <span class="font-normal text-muted">{{ day.min }}</span>
              </p>
            </div>
          </div>
        </div>
        <div v-if="hasHourly" class="overflow-x-auto">
          <HourlyTempChart :hours="day.hours" />
        </div>
        <p v-else data-testid="day-no-hourly" class="py-8 text-center text-muted">
          {{ t('forecast.day.noHourly') }}
        </p>
      </div>
      <button
        type="button"
        data-testid="day-next"
        :aria-label="t('forecast.day.next')"
        :disabled="index === last"
        class="w-8 shrink-0 text-lg hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent sm:w-10 sm:text-xl"
        @click="go(1)"
      >
        ▶
      </button>
    </div>
  </dialog>
</template>
