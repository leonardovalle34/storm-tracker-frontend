import type { ForecastResponse, MarineResponse, MoonPhase } from '@/types/weather'
import { get } from './http'

export const getForecast = (lat: number, lon: number) =>
  get<ForecastResponse>('/weather/forecast', { lat, lon })

export const getMarine = (lat: number, lon: number) => get<MarineResponse>('/weather/marine', { lat, lon })

export const getMoonPhase = (date: string) => get<MoonPhase>('/weather/moon-phase', { target_date: date })
