export type WeatherKey =
  | 'clear'
  | 'partlyCloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'showers'
  | 'thunderstorm'
  | 'unknown'

const ICONS: Record<WeatherKey, string> = {
  clear: '☀️',
  partlyCloudy: '⛅',
  overcast: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  snow: '❄️',
  showers: '🌦️',
  thunderstorm: '⛈️',
  unknown: '🌤️',
}

// night variants: no sun in the icon. Keys left out (overcast, rain, ...) have no sun to begin with.
const NIGHT_ICONS: Partial<Record<WeatherKey, string>> = {
  clear: '🌙',
  partlyCloudy: '☁️',
  drizzle: '🌧️',
  showers: '🌧️',
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

/**
 * WMO weather_code -> icon + i18n key. A missing code is 'unknown' (no guessing from precipitation).
 * isDay is Open-Meteo's is_day: 0 = night (moon instead of sun); 1 or missing = day.
 */
export function describeWeather(
  code?: number | null,
  isDay?: number | null,
): { key: WeatherKey; icon: string } {
  const key = code == null ? 'unknown' : keyFromCode(code)
  const night = isDay === 0 ? NIGHT_ICONS[key] : undefined
  return { key, icon: night ?? ICONS[key] }
}

// every WMO code Open-Meteo sends; each has a detailed name under `wmo.c<code>` in the locales
const WMO_CODES = new Set([
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
])

/** i18n key of the detailed name of a WMO code ("Slight rain showers"); 'weather.unknown' otherwise */
export const wmoNameKey = (code?: number | null) =>
  code != null && WMO_CODES.has(code) ? `wmo.c${code}` : 'weather.unknown'
