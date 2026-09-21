import type { HourlyForecast, MarineHourly } from '@/types/weather'
import { windLevel, type WindLevel } from './wind'

/** One column every 3 hours, 3h..21h. */
export const HOURS = [3, 6, 9, 12, 15, 18, 21]

export interface Day<C> {
  date: string
  columns: C[]
}

/** Groups "YYYY-MM-DDTHH:00" timestamps by day, keeping only the 3-hour columns. */
function groupDays<C>(times: string[], build: (i: number, hour: number) => C): Day<C>[] {
  const days = new Map<string, C[]>()
  times.forEach((t, i) => {
    const hour = Number(t.slice(11, 13))
    if (!HOURS.includes(hour) || t.slice(14, 16) !== '00') return
    const date = t.slice(0, 10)
    if (!days.has(date)) days.set(date, [])
    days.get(date)!.push(build(i, hour))
  })
  return [...days].map(([date, columns]) => ({ date, columns }))
}

/**
 * Index of the largest non-null value in the 3h window centred on `i` (i-1..i+1: the 15h column
 * covers 14h, 15h, 16h), or -1 if the whole window is empty. Ties keep the earliest hour.
 */
function peakIndex(values: readonly (number | null | undefined)[], i: number): number {
  let best = -1
  for (let j = Math.max(0, i - 1); j <= Math.min(values.length - 1, i + 1); j++) {
    const v = values[j]
    if (v == null) continue
    if (best === -1 || v > (values[best] as number)) best = j
  }
  return best
}

const maxIn = (values: readonly (number | null | undefined)[], i: number): number | null => {
  const j = peakIndex(values, i)
  return j === -1 ? null : (values[j] as number)
}

export interface WindColumn {
  hour: number
  knots: number
  direction: number
  level: WindLevel
  /** null when the API has no gust value for the hour */
  gustKnots: number | null
  gustLevel: WindLevel | null
}

export function buildWindDays(
  h: Pick<HourlyForecast, 'time' | 'wind_speed_10m' | 'wind_direction_10m' | 'wind_gusts_10m'>,
): Day<WindColumn>[] {
  return groupDays(h.time, (i, hour) => {
    // Each column is the PEAK of its 3h window (hour-1..hour+1), so a spike at 14h/16h is not lost.
    // The API already returns knots (wind_speed_unit=kn).
    const peak = peakIndex(h.wind_speed_10m, i)
    const at = peak === -1 ? i : peak // direction always comes from the same instant as the speed
    const knots = h.wind_speed_10m[at]
    const gustKnots = h.wind_gusts_10m ? maxIn(h.wind_gusts_10m, i) : null // same unit as the wind, so same scale
    return {
      hour,
      knots,
      direction: h.wind_direction_10m[at],
      level: windLevel(knots),
      gustKnots,
      gustLevel: gustKnots === null ? null : windLevel(gustKnots),
    }
  })
}

export interface MarineColumn {
  hour: number
  swell: number | null
  period: number | null
  swellDir: number | null
  tide: number | null
  waterTemp: number | null
}

export interface MarineDay extends Day<MarineColumn> {
  /** Tide (sea_level_height_msl) for every hour of the day, indexed by hour 0..23; null where missing. */
  tideSeries: (number | null)[]
  /** Any hour of the day has a null sea level or swell height. */
  hasGaps: boolean
  /** At least one hour of the day has a sea level or swell height value. */
  hasData: boolean
}

/** Index of the first day with missing data (per location, from the response itself); -1 if none. */
export const firstGapIndex = (days: MarineDay[]): number => days.findIndex((d) => d.hasGaps)

export function buildMarineDays(h: MarineHourly): MarineDay[] {
  const tideByDate = new Map<string, (number | null)[]>()
  h.time.forEach((t, i) => {
    const date = t.slice(0, 10)
    if (!tideByDate.has(date)) tideByDate.set(date, Array<number | null>(24).fill(null))
    tideByDate.get(date)![Number(t.slice(11, 13))] = h.sea_level_height_msl[i] ?? null
  })
  return groupDays(h.time, (i, hour) => {
    // Swell is the PEAK of the 3h window; period and direction come from that same instant.
    const peak = peakIndex(h.swell_wave_height, i)
    const at = peak === -1 ? i : peak
    return {
      hour,
      swell: peak === -1 ? null : h.swell_wave_height[peak],
      period: h.swell_wave_period[at] ?? null,
      swellDir: h.swell_wave_direction[at] ?? null,
      tide: h.sea_level_height_msl[i] ?? null,
      waterTemp: h.sea_surface_temperature[i] ?? null,
    }
  }).map((d) => {
    const idx = h.time.flatMap((t, i) => (t.startsWith(d.date) ? [i] : []))
    const missing = (i: number) => h.sea_level_height_msl[i] == null || h.swell_wave_height[i] == null
    const present = (i: number) => h.sea_level_height_msl[i] != null || h.swell_wave_height[i] != null
    return {
      ...d,
      tideSeries: tideByDate.get(d.date)!,
      hasGaps: idx.some(missing),
      hasData: idx.some(present),
    }
  })
}

/** Coastal iff the API returned any non-null wave_height — no geographic logic. */
export const hasWaveData = (h?: MarineHourly | null): boolean =>
  !!h?.wave_height?.some((v) => v !== null && v !== undefined)
