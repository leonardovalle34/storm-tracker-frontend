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

/** WMO weather_code -> icon + i18n key. A missing code is 'unknown' (no guessing from precipitation). */
export function describeWeather(code?: number | null): { key: WeatherKey; icon: string } {
  const key = code == null ? 'unknown' : keyFromCode(code)
  return { key, icon: ICONS[key] }
}
