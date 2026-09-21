import type { TempUnit } from './temperature'
import type { WindUnit } from './wind'

export type WindyOverlay = 'rain' | 'wind' | 'temp' | 'waves' | 'sst'

/** Windy embed2.html. `expanded` = modal version: closer zoom and the Windy menu visible. */
export function windyUrl(
  loc: { latitude: number; longitude: number },
  overlay: WindyOverlay,
  expanded = false,
  tempUnit: TempUnit = 'C',
  windUnit: WindUnit = 'kn',
): string {
  const p = new URLSearchParams({
    lat: String(loc.latitude),
    lon: String(loc.longitude),
    detailLat: String(loc.latitude),
    detailLon: String(loc.longitude),
    zoom: expanded ? '7' : '5',
    level: 'surface',
    overlay,
    product: 'ecmwf',
    menu: expanded ? 'true' : '',
    message: 'true',
    marker: 'true',
    calendar: 'now',
    type: 'map',
    location: 'coordinates',
    metricWind: windUnit === 'km/h' ? 'km/h' : 'kt',
    metricTemp: `°${tempUnit}`,
    radarRange: '-1',
  })
  return `https://embed.windy.com/embed2.html?${p}`
}
