import type { HourlyForecast } from '@/types/weather'
import { describeWeather, type WeatherKey } from './weatherCode'

export interface DayHour {
  /** 0..23 */
  hour: number
  /** °C as sent by the API; null where missing */
  temp: number | null
  weather: { key: WeatherKey; icon: string }
  /** the hour's own WMO code (null where missing) and mm of the preceding hour, for the tooltip */
  code?: number | null
  precipitation?: number | null
}

/**
 * All 24 hours of one day (not the 3-hour columns of the grids). Each hour uses its own weather_code
 * (and is_day for the night icon). The daily code is never used here: it is the day's most severe
 * event (e.g. 95 = thunderstorm) and would paint every hour with it; a missing hourly code is 'unknown'.
 */
export function buildDayHours(
  hourly: Pick<HourlyForecast, 'time' | 'temperature_2m' | 'weather_code' | 'is_day' | 'precipitation'>,
  date: string,
): DayHour[] {
  const hours: DayHour[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    temp: null,
    weather: describeWeather(null),
    code: null,
    precipitation: null,
  }))
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(date) || t.slice(14, 16) !== '00') return
    const h = hours[Number(t.slice(11, 13))]
    if (!h) return
    h.temp = hourly.temperature_2m?.[i] ?? null
    h.code = hourly.weather_code?.[i] ?? null
    h.weather = describeWeather(h.code, hourly.is_day?.[i])
    h.precipitation = hourly.precipitation?.[i] ?? null
  })
  return hours
}
