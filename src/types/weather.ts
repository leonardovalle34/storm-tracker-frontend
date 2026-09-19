export interface Location {
  name: string
  latitude: number
  longitude: number
}

export interface DailyForecast {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  weather_code?: number[]
  uv_index_max?: number[]
  sunrise?: string[]
  sunset?: string[]
}

export interface HourlyForecast {
  time: string[]
  temperature_2m?: number[]
  precipitation?: number[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
}

export interface ForecastResponse {
  daily: DailyForecast
  hourly: HourlyForecast
}

export interface MarineHourly {
  time: string[]
  wave_height: (number | null)[]
  swell_wave_height: (number | null)[]
  swell_wave_direction?: (number | null)[]
  swell_wave_period?: (number | null)[]
  sea_level_height_msl: (number | null)[]
  sea_surface_temperature: (number | null)[]
}

export interface MarineResponse {
  hourly: MarineHourly
}

export interface MoonPhase {
  date: string
  phase_index: number
  phase_name: string
}
