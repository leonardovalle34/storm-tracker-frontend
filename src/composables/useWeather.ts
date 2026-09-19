import { computed, ref, watch } from 'vue'
import { fetchForecast, fetchMarine } from '@/services/api'
import type { ForecastResponse, MarineResponse } from '@/types/weather'
import { hasWaveData } from '@/utils/hourly'
import { useSelectedLocation } from './useSelectedLocation'

export function useWeather() {
  const { location } = useSelectedLocation()
  const forecast = ref<ForecastResponse | null>(null)
  const marine = ref<MarineResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let token = 0

  async function load() {
    const loc = location.value
    if (!loc) return
    const current = ++token
    loading.value = true
    error.value = null
    // allSettled: a marine failure must not take the forecast down with it.
    const [f, m] = await Promise.allSettled([
      fetchForecast(loc.latitude, loc.longitude),
      fetchMarine(loc.latitude, loc.longitude),
    ])
    if (current !== token) return
    forecast.value = f.status === 'fulfilled' ? f.value : null
    marine.value = m.status === 'fulfilled' ? m.value : null
    error.value = f.status === 'rejected' ? String(f.reason?.message ?? f.reason) : null
    loading.value = false
  }

  watch(location, load, { immediate: true })

  const isCoastal = computed(() => hasWaveData(marine.value?.hourly))

  return { forecast, marine, loading, error, isCoastal, reload: load }
}
