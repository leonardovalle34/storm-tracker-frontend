import type { ForecastResponse, MarineResponse } from '@/types/weather'

export const hoursOf = (days: string[]) =>
  days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`))

export function makeForecast(days = ['2026-09-19', '2026-09-20']): ForecastResponse {
  const time = hoursOf(days)
  return {
    daily: {
      time: days,
      temperature_2m_max: days.map((_, i) => 30.4 + i),
      temperature_2m_min: days.map((_, i) => 20.6 + i),
      precipitation_sum: days.map((_, i) => 1.5 * i),
      weather_code: days.map(() => 63),
    },
    hourly: {
      time,
      wind_speed_10m: time.map((_, i) => (i % 24 === 3 ? 3 : i % 24 === 6 ? 13 : i % 24 === 9 ? 22 : 32)), // knots
      wind_direction_10m: time.map((_, i) => (i % 24) * 10),
    },
  }
}

export function makeMarine(coastal: boolean, days = ['2026-09-19']): MarineResponse {
  const time = hoursOf(days)
  return {
    hourly: {
      time,
      wave_height: time.map(() => (coastal ? 1.2 : null)),
      swell_wave_height: time.map(() => 1.5),
      sea_level_height_msl: time.map(() => 0.25),
      sea_surface_temperature: time.map(() => 22.4),
    },
  }
}
