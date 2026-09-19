export type WeatherKey =
  | 'clear' | 'partlyCloudy' | 'overcast' | 'fog' | 'drizzle'
  | 'rain' | 'snow' | 'showers' | 'thunderstorm' | 'unknown'

const ICONS: Record<WeatherKey, string> = {
  clear: '☀️', partlyCloudy: '⛅', overcast: '☁️', fog: '🌫️', drizzle: '🌦️',
  rain: '🌧️', snow: '❄️', showers: '🌦️', thunderstorm: '⛈️', unknown: '🌤️',
}

function keyFromCode(code: number): WeatherKey {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partlyCloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code >= 61 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'showers'
  if (code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunderstorm'
  return 'unknown'
}

/** WMO weather_code -> icon + i18n key. Without a code, degrade to a precipitation-based guess. */
export function describeWeather(code?: number | null, precipitationMm?: number | null): { key: WeatherKey; icon: string } {
  let key: WeatherKey
  if (code != null) key = keyFromCode(code)
  else if ((precipitationMm ?? 0) >= 10) key = 'rain'
  else if ((precipitationMm ?? 0) >= 1) key = 'showers'
  else key = 'unknown'
  return { key, icon: ICONS[key] }
}
