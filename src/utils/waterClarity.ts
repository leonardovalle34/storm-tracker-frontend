/**
 * Water clarity — a rule-based ESTIMATE, not a measurement (no weather/marine API reports underwater
 * visibility). Waves and wind stir sediment, and rain in the last 24 h washes turbid runoff into the sea,
 * so those are what we score. Start at 100 and subtract:
 *  waves above 0.3 m: 35 points per meter (max 60)
 *  wind above 8 kt:   2.5 points per knot
 *  rain in the last 24 h: 2 points per mm (max 40)
 *  swell period under 6 s (choppy wind sea): 10 points
 */
import type { ForecastResponse, MarineResponse } from '@/types/weather'
import { daylightHours } from './activityPlanner'

export type ClarityLabel = 'excellent' | 'good' | 'moderate' | 'poor'

export interface ClarityInput {
  waveHeight: number | null
  windKt: number | null
  swellPeriod: number | null
  rain24h: number | null
}

export function estimateWaterClarity(i: ClarityInput): number | null {
  if (i.waveHeight === null || i.windKt === null) return null
  let score = 100
  score -= Math.min(60, Math.max(0, i.waveHeight - 0.3) * 35)
  score -= Math.max(0, i.windKt - 8) * 2.5
  score -= Math.min(40, (i.rain24h ?? 0) * 2)
  if (i.swellPeriod !== null && i.swellPeriod < 6) score -= 10
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function clarityLabel(score: number): ClarityLabel {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'moderate'
  return 'poor'
}

export interface DayClarity {
  score: number
  label: ClarityLabel
}

/** Per-date clarity: average over the daylight hours, with rain summed over the 24 h before each hour. */
export function clarityByDay(forecast: ForecastResponse, marine: MarineResponse): Map<string, DayClarity> {
  const fTimes = forecast.hourly.time
  const fIdx = new Map(fTimes.map((t, i) => [t, i]))
  const mIdx = new Map(marine.hourly.time.map((t, i) => [t, i]))
  const dailyIdx = new Map(forecast.daily.time.map((d, i) => [d, i]))
  const rain = forecast.hourly.precipitation
  const out = new Map<string, DayClarity>()

  for (const date of new Set(marine.hourly.time.map((t) => t.slice(0, 10)))) {
    const di = dailyIdx.get(date)
    const hours = daylightHours(forecast.daily.sunrise?.[di ?? -1], forecast.daily.sunset?.[di ?? -1])
    const scores: number[] = []
    for (const h of hours) {
      const key = `${date}T${String(h).padStart(2, '0')}:00`
      const f = fIdx.get(key)
      const m = mIdx.get(key)
      if (f === undefined || m === undefined) continue
      let rain24h: number | null = null
      if (rain) {
        rain24h = 0
        for (let k = Math.max(0, f - 23); k <= f; k++) rain24h += rain[k] ?? 0
      }
      const s = estimateWaterClarity({
        waveHeight: marine.hourly.wave_height[m] ?? null,
        windKt: forecast.hourly.wind_speed_10m[f] ?? null,
        swellPeriod: marine.hourly.swell_wave_period?.[m] ?? null,
        rain24h,
      })
      if (s !== null) scores.push(s)
    }
    if (scores.length) {
      const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      out.set(date, { score, label: clarityLabel(score) })
    }
  }
  return out
}
