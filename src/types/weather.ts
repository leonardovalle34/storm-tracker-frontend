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
  weather_code: number[]
  uv_index_max?: number[]
  /** "feels like" daily max in °C; optional until the backend sends it */
  apparent_temperature_max?: (number | null)[]
  sunrise?: string[]
  sunset?: string[]
}

export interface HourlyForecast {
  time: string[]
  temperature_2m?: number[]
  /** mm in the PRECEDING hour (Open-Meteo); > 0 marks an hour with rain for the daily icon */
  precipitation?: (number | null)[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  /** knots, same unit and scale as wind_speed_10m; optional until every backend sends it */
  wind_gusts_10m?: (number | null)[]
  /** WMO code of each hour (not the day's worst event); optional until every backend sends it */
  weather_code?: (number | null)[]
  /** 1 = daylight, 0 = night; picks the night icon variant. Optional like weather_code */
  is_day?: (number | null)[]
}

/** Conditions right now. Optional: backends that predate it simply omit it. */
export interface CurrentWeather {
  temperature_2m?: number | null
  weather_code?: number | null
  wind_speed_10m?: number | null // knots, like the hourly wind
}

export interface ForecastResponse {
  daily: DailyForecast
  hourly: HourlyForecast
  current?: CurrentWeather | null
}

export interface MarineHourly {
  time: string[]
  wave_height: (number | null)[]
  swell_wave_height: (number | null)[]
  swell_wave_direction: (number | null)[]
  swell_wave_period: (number | null)[]
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
