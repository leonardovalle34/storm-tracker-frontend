<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocationStore } from '@/stores/location'
import { useUnitsStore } from '@/stores/units'
import { useWeatherStore } from '@/stores/weather'
import { formatTemp } from '@/utils/temperature'
import { formatWind } from '@/utils/wind'
import { describeWeather } from '@/utils/weatherCode'

const { t } = useI18n()
const { location } = storeToRefs(useLocationStore())
const { forecast } = storeToRefs(useWeatherStore())
const { temperature: unit, windUnit } = storeToRefs(useUnitsStore())

// The backend may not send `current` yet: then there is nothing to show.
const current = computed(() => {
  const c = forecast.value?.current
  if (!location.value || !c) return null
  const temp = c.temperature_2m ?? null
  const wind = c.wind_speed_10m ?? null
  if (temp === null && wind === null && c.weather_code == null) return null
  return { temp, wind, ...describeWeather(c.weather_code) }
})
</script>

<template>
  <span
    v-if="current"
    data-testid="current-weather"
    role="group"
    :aria-label="t('map.now')"
    class="flex items-center gap-3 text-sm text-muted"
  >
    <span
      data-testid="current-label"
      :title="t('map.now')"
      class="rounded bg-surface-2 px-1.5 py-px text-xs font-semibold uppercase tracking-wide text-ink"
      >{{ t('map.nowShort') }}</span
    >
    <span :title="t(`weather.${current.key}`)" data-testid="current-icon">{{ current.icon }}</span>
    <span v-if="current.temp !== null" data-testid="current-temp">{{ formatTemp(current.temp, unit) }}</span>
    <span v-if="current.wind !== null" data-testid="current-wind"
      >💨 {{ formatWind(current.wind, windUnit) }}</span
    >
  </span>
</template>
