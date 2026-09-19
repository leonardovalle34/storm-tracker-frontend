import type { Location } from '@/types/weather'

/** Shape kept in localStorage. */
interface StoredPlace {
  name: string
  lat: number
  lon: number
}

/** Same place = same coordinates (4 decimals, like the coordinate names), whatever it is called. */
export const samePlace = (a: Location, b: Location) =>
  a.latitude.toFixed(4) === b.latitude.toFixed(4) && a.longitude.toFixed(4) === b.longitude.toFixed(4)

export function readPlaces(key: string): Location[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(data)) return []
    return data
      .filter(
        (p): p is StoredPlace =>
          !!p && typeof p.name === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lon),
      )
      .map((p) => ({ name: p.name, latitude: p.lat, longitude: p.lon }))
  } catch {
    return []
  }
}

export function writePlaces(key: string, places: Location[]) {
  try {
    const data: StoredPlace[] = places.map((p) => ({ name: p.name, lat: p.latitude, lon: p.longitude }))
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* storage unavailable or full: keep working in memory */
  }
}

/** New list with `place` first (any previous copy removed), cut to `max`. */
export const withPlaceFirst = (list: Location[], place: Location, max: number): Location[] =>
  [place, ...list.filter((p) => !samePlace(p, place))].slice(0, max)
