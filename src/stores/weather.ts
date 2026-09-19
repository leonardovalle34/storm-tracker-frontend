import { defineStore } from 'pinia'
import { ApiError } from '@/services/http'
import { getForecast, getMarine, getMoonPhase } from '@/services/weatherService'
import type { ForecastResponse, MarineResponse, MoonPhase } from '@/types/weather'
import { errorMessage } from '@/utils/errors'
import { trimEmptyTrailingDays } from '@/utils/forecast'
import { hasWaveData } from '@/utils/hourly'
import { useLocationStore } from './location'

// Lookups in flight, so concurrent requests for the same date share one call.
const moonInflight = new Map<string, Promise<MoonPhase>>()

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    forecast: null as ForecastResponse | null,
    marine: null as MarineResponse | null,
    loading: false,
    error: null as string | null,
    loadToken: 0,
    // Moon phase depends only on the date, so it is kept across locations (saves the backend rate limit).
    moonPhases: {} as Record<string, MoonPhase>,
    /** Backend detail of a 400 (bad date format), per date. */
    moonErrors: {} as Record<string, string>,
  }),

  getters: {
    isCoastal: (state) => hasWaveData(state.marine?.hourly),
  },

  actions: {
    /**
     * Loads forecast + marine for the selected location; a stale response never overwrites a newer one.
     * The error is kept in `error` (the page reacts to state), not re-thrown.
     */
    async load() {
      const loc = useLocationStore().location
      if (!loc) return
      const current = ++this.loadToken
      this.loading = true
      this.error = null
      try {
        // allSettled: a marine failure must not take the forecast down with it.
        const [f, m] = await Promise.allSettled([
          getForecast(loc.latitude, loc.longitude),
          getMarine(loc.latitude, loc.longitude),
        ])
        if (current !== this.loadToken) return
        this.marine = m.status === 'fulfilled' ? m.value : null
        if (f.status === 'rejected') throw f.reason
        this.forecast = trimEmptyTrailingDays(f.value)
      } catch (err) {
        if (current !== this.loadToken) return
        this.forecast = null
        this.error = errorMessage(err)
      } finally {
        if (current === this.loadToken) this.loading = false
      }
    },

    /**
     * Cached per date. No global loading/error here: it is an optional indicator per day, so a 400 is
     * kept per date in `moonErrors` and any other failure just leaves it empty (and retryable).
     */
    async loadMoonPhase(date: string) {
      if (date in this.moonPhases) return
      let request = moonInflight.get(date)
      if (!request) {
        request = getMoonPhase(date)
        moonInflight.set(date, request)
      }
      try {
        this.moonPhases[date] = await request
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) this.moonErrors[date] = err.detail ?? ''
      } finally {
        moonInflight.delete(date)
      }
    },
  },
})
