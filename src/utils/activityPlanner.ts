import type { ForecastResponse, MarineResponse } from '@/types/weather'
import { ACTIVITIES, scoreHour, scoreLabel, type Activity, type ScoreLabel } from './activityScorer'

/** Hours within this many points of the day's best hour join its window. */
export const WINDOW_TOLERANCE = 10

const DEFAULT_DAYLIGHT = Array.from({ length: 12 }, (_, i) => i + 6)

/** Whole hours of daylight from ISO sunrise/sunset ("YYYY-MM-DDTHH:MM"); 6h-17h when unknown. */
export function daylightHours(sunrise?: string, sunset?: string): number[] {
  if (!sunrise || !sunset) return DEFAULT_DAYLIGHT
  const dec = (t: string) => Number(t.slice(11, 13)) + Number(t.slice(14, 16)) / 60
  const first = Math.ceil(dec(sunrise))
  const last = Math.floor(dec(sunset)) - 1
  return last >= first ? Array.from({ length: last - first + 1 }, (_, i) => first + i) : DEFAULT_DAYLIGHT
}

export interface Window {
  start: number
  /** last hour included (the window ends at the end of this hour) */
  end: number
  score: number
}

/** Best continuous window: the peak hour plus the contiguous neighbours within WINDOW_TOLERANCE of it. */
export function bestWindow(scores: Map<number, number>): Window | null {
  if (!scores.size) return null
  const hours = [...scores.keys()].sort((a, b) => a - b)
  const peak = hours.reduce((best, h) => (scores.get(h)! > scores.get(best)! ? h : best), hours[0])
  const min = scores.get(peak)! - WINDOW_TOLERANCE
  let start = peak
  let end = peak
  while (scores.has(start - 1) && scores.get(start - 1)! >= min) start--
  while (scores.has(end + 1) && scores.get(end + 1)! >= min) end++
  let sum = 0
  for (let h = start; h <= end; h++) sum += scores.get(h)!
  return { start, end, score: Math.round(sum / (end - start + 1)) }
}

export const formatWindow = (w: Pick<Window, 'start' | 'end'>): string => `${w.start}h–${w.end + 1}h`

export interface Recommendation {
  activity: Activity
  score: number | null
  label: ScoreLabel | 'stormy' | null
  start: number | null
  end: number | null
}

const at = <T>(arr: (T | null)[] | undefined, i: number | undefined): T | null =>
  i === undefined ? null : (arr?.[i] ?? null)

/**
 * Recommendations per date. Wind comes from the forecast, swell/waves from marine, weather from the
 * hourly weather_code when the API provides it, otherwise the day's daily weather_code.
 * Dates without any marine data are omitted.
 */
export function planDays(forecast: ForecastResponse, marine: MarineResponse): Map<string, Recommendation[]> {
  const fIdx = new Map(forecast.hourly.time.map((t, i) => [t, i]))
  const mIdx = new Map(marine.hourly.time.map((t, i) => [t, i]))
  const dailyIdx = new Map(forecast.daily.time.map((d, i) => [d, i]))
  const dates = [...new Set(marine.hourly.time.map((t) => t.slice(0, 10)))]
  const out = new Map<string, Recommendation[]>()

  for (const date of dates) {
    const di = dailyIdx.get(date)
    const dailyCode = at(forecast.daily.weather_code, di)
    const hours = daylightHours(forecast.daily.sunrise?.[di ?? -1], forecast.daily.sunset?.[di ?? -1])
    const perActivity = Object.fromEntries(ACTIVITIES.map((a) => [a, new Map<number, number>()])) as Record<
      Activity,
      Map<number, number>
    >
    let scored = 0
    let stormy = 0
    let anyMarine = false

    for (const h of hours) {
      const key = `${date}T${String(h).padStart(2, '0')}:00`
      const f = fIdx.get(key)
      const m = mIdx.get(key)
      if (m !== undefined) anyMarine = true
      const r = scoreHour({
        weatherCode: at(forecast.hourly.weather_code, f) ?? dailyCode,
        windDir: at(forecast.hourly.wind_direction_10m, f),
        windKt: at(forecast.hourly.wind_speed_10m, f),
        swellDir: at(marine.hourly.swell_wave_direction, m),
        swellPeriod: at(marine.hourly.swell_wave_period, m),
        waveHeight: at(marine.hourly.wave_height, m),
      })
      scored++
      if (r.stormy) stormy++
      for (const a of ACTIVITIES) if (r.scores[a] !== null) perActivity[a].set(h, r.scores[a]!)
    }
    if (!anyMarine) continue

    const allStormy = scored > 0 && stormy === scored
    out.set(
      date,
      ACTIVITIES.map((activity): Recommendation => {
        if (allStormy) return { activity, score: 0, label: 'stormy', start: null, end: null }
        const w = bestWindow(perActivity[activity])
        return w
          ? { activity, score: w.score, label: scoreLabel(w.score), start: w.start, end: w.end }
          : { activity, score: null, label: null, start: null, end: null }
      }),
    )
  }
  return out
}
