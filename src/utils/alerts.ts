import type { DailyForecast, HourlyForecast, MarineHourly } from '@/types/weather'
import { hasWaveData } from './hourly'
import { knotsToKmh } from './wind'
import { describeWeather } from './weatherCode'

export type Severity = 'none' | 'moderate' | 'high' | 'severe'
export type ActiveSeverity = Exclude<Severity, 'none'>
export type AlertCategory = 'rain' | 'snow' | 'heat' | 'wind' | 'storm' | 'sea'
export interface Alert {
  category: AlertCategory
  severity: ActiveSeverity
}
export interface DayAlerts {
  date: string
  alerts: Alert[]
}

export { knotsToKmh }

/** Highest first, so the worst matching rule wins. */
const RANK: Record<Severity, number> = { none: 0, moderate: 1, high: 2, severe: 3 }
export const worstSeverity = (a: Severity, b: Severity): Severity => (RANK[a] >= RANK[b] ? a : b)
export const severityRank = (s: Severity) => RANK[s]

/** Daily precipitation total in mm: moderate >= 20, high >= 50, severe >= 100. */
export function classifyRainSeverity(precipitationMm?: number | null): Severity {
  if (precipitationMm == null) return 'none'
  if (precipitationMm >= 100) return 'severe'
  if (precipitationMm >= 50) return 'high'
  if (precipitationMm >= 20) return 'moderate'
  return 'none'
}

/**
 * Daily precipitation in mm of water equivalent on a snow day (roughly 1 mm = 1 cm of snow):
 * moderate >= 5, high >= 15, severe >= 30. Much lower than rain, since snow accumulates.
 */
export function classifySnowSeverity(precipitationMm?: number | null): Severity {
  if (precipitationMm == null) return 'none'
  if (precipitationMm >= 30) return 'severe'
  if (precipitationMm >= 15) return 'high'
  if (precipitationMm >= 5) return 'moderate'
  return 'none'
}

/** Daily max apparent ("feels like") temperature in °C: moderate 33-38, high 38-44, severe above 44. */
export function classifyHeatSeverity(apparentTemperatureMax?: number | null): Severity {
  if (apparentTemperatureMax == null) return 'none'
  if (apparentTemperatureMax > 44) return 'severe'
  if (apparentTemperatureMax >= 38) return 'high'
  if (apparentTemperatureMax >= 33) return 'moderate'
  return 'none'
}

const classifyKmh = (kmh?: number | null): Severity => {
  if (kmh == null) return 'none'
  if (kmh > 100) return 'severe'
  if (kmh >= 60) return 'high'
  if (kmh >= 40) return 'moderate'
  return 'none'
}

/**
 * Wind in knots (sustained and gust), each converted to km/h and classified on its own with the same
 * thresholds (moderate 40-60, high 60-100, severe above 100); the worst of the two wins, so a gust
 * over the limit raises the alert even when the sustained wind is below it.
 */
export function classifyWindSeverity(
  windSpeedKnots?: number | null,
  windGustsKnots?: number | null,
): Severity {
  const kmh = (kt?: number | null) => (kt == null ? null : knotsToKmh(kt))
  return worstSeverity(classifyKmh(kmh(windSpeedKnots)), classifyKmh(kmh(windGustsKnots)))
}

/** WMO code: 95 thunderstorm is moderate, 96 and 99 (with hail) are severe. */
export function classifyStormSeverity(weatherCode?: number | null): Severity {
  if (weatherCode === 96 || weatherCode === 99) return 'severe'
  if (weatherCode === 95) return 'moderate'
  return 'none'
}

/**
 * Sea condition from wave height (m) and wind (km/h); a missing input is ignored. Only meaningful for
 * locations with ocean data: callers skip it otherwise.
 */
export function classifySeaSeverity(waveHeightM?: number | null, windSpeedKmh?: number | null): Severity {
  const wave = waveHeightM ?? -Infinity
  const wind = windSpeedKmh ?? -Infinity
  if (wave >= 3.5 || wind >= 60) return 'severe'
  if (wave >= 2.5 || wind >= 50) return 'high'
  if (wave >= 2) return 'moderate'
  return 'none'
}

const maxOfDay = (times: string[], values: (number | null | undefined)[], date: string): number | null => {
  let max: number | null = null
  times.forEach((t, i) => {
    const v = values[i]
    if (t.startsWith(date) && v != null && (max === null || v > max)) max = v
  })
  return max
}

interface BuildInput {
  daily: DailyForecast
  hourly?: Pick<HourlyForecast, 'time' | 'wind_speed_10m' | 'wind_gusts_10m'> | null
  marine?: MarineHourly | null
}

/** Per day, the categories that are active (order: rain, wind, storm, sea). Sea only with ocean data. */
export function buildDayAlerts({ daily, hourly, marine }: BuildInput): DayAlerts[] {
  const withSea = hasWaveData(marine)
  return daily.time.map((date, i) => {
    const windKt = hourly ? maxOfDay(hourly.time, hourly.wind_speed_10m, date) : null
    const gustKt = hourly?.wind_gusts_10m ? maxOfDay(hourly.time, hourly.wind_gusts_10m, date) : null
    const windKmh = windKt === null ? null : knotsToKmh(windKt)
    // The daily precipitation total does not say what fell: on a snow day it is snow, not rain.
    // The daily code is the worst hour of the day, so one thundery hour on a day that never thaws
    // (high mountains) arrives as 95-99: that is thundersnow inside a snowfall, not a storm.
    const code = daily.weather_code?.[i]
    const frozenDay = (daily.temperature_2m_max?.[i] ?? Infinity) <= 0
    const snowDay =
      describeWeather(code).key === 'snow' || (frozenDay && classifyStormSeverity(code) !== 'none')
    const found: [AlertCategory, Severity][] = [
      snowDay
        ? ['snow', classifySnowSeverity(daily.precipitation_sum[i])]
        : ['rain', classifyRainSeverity(daily.precipitation_sum[i])],
      ['heat', classifyHeatSeverity(daily.apparent_temperature_max?.[i])],
      ['wind', classifyWindSeverity(windKt, gustKt)],
      ['storm', snowDay ? 'none' : classifyStormSeverity(code)],
    ]
    if (withSea) {
      found.push(['sea', classifySeaSeverity(maxOfDay(marine!.time, marine!.wave_height, date), windKmh)])
    }
    const alerts = found.flatMap(([category, severity]) =>
      severity === 'none' ? [] : [{ category, severity } as Alert],
    )
    return { date, alerts }
  })
}

export const WARNING_DAYS = 3

export interface Warning extends Alert {
  /** the days (in order) on which this category is high or severe */
  dates: string[]
}

/** Worst level per category over the coming days, keeping only high and severe (drives the banner). */
export function upcomingWarnings(days: DayAlerts[], window = WARNING_DAYS): Warning[] {
  const found = new Map<AlertCategory, Warning>()
  for (const day of days.slice(0, window)) {
    for (const a of day.alerts) {
      if (RANK[a.severity] < RANK.high) continue
      const w = found.get(a.category)
      if (!w) found.set(a.category, { ...a, dates: [day.date] })
      else {
        w.dates.push(day.date)
        if (RANK[a.severity] > RANK[w.severity]) w.severity = a.severity
      }
    }
  }
  const order: AlertCategory[] = ['rain', 'snow', 'heat', 'wind', 'storm', 'sea']
  return order.flatMap((category) => (found.has(category) ? [found.get(category)!] : []))
}
