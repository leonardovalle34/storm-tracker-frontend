import type { HourlyForecast } from '@/types/weather'
import { describeWeather, type WeatherKey } from './weatherCode'

export interface DayHour {
  /** 0..23 */
  hour: number
  /** °C as sent by the API; null where missing */
  temp: number | null
  weather: { key: WeatherKey; icon: string }
}

/**
 * All 24 hours of one day (not the 3-hour columns of the grids). Each hour uses its own weather_code
 * when the backend sends it, otherwise the day's code, repeated on every hour.
 */
export function buildDayHours(
  hourly: Pick<HourlyForecast, 'time' | 'temperature_2m' | 'weather_code'>,
  date: string,
  dailyCode?: number | null,
): DayHour[] {
  const hours: DayHour[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    temp: null,
    weather: describeWeather(dailyCode),
  }))
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(date) || t.slice(14, 16) !== '00') return
    const h = hours[Number(t.slice(11, 13))]
    if (!h) return
    h.temp = hourly.temperature_2m?.[i] ?? null
    const code = hourly.weather_code?.[i]
    if (code != null) h.weather = describeWeather(code)
  })
  return hours
}
