import type { ForecastResponse, Location, MarineResponse, MoonPhase } from '@/types/weather'

export type { Location }

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const res = await fetch(`${BASE_URL}${path}?${qs}`)
  if (!res.ok) throw new Error(`Request to ${path} failed with status ${res.status}`)
  return (await res.json()) as T
}

interface NominatimItem { display_name: string; lat: string; lon: string }
interface OpenMeteoGeoItem { name: string; latitude: number; longitude: number; country?: string | null; admin1?: string | null }

/** The backend proxies Nominatim (array of {display_name, lat, lon}); the {results: [...]} shape is also accepted. */
export async function geocode(name: string): Promise<Location[]> {
  const data = await get<NominatimItem[] | { results?: OpenMeteoGeoItem[] }>('/weather/geocode', { name })
  if (Array.isArray(data)) {
    return data.map((i) => ({ name: i.display_name, latitude: Number(i.lat), longitude: Number(i.lon) }))
  }
  return (data.results ?? []).map((i) => ({
    name: [i.name, i.country].filter(Boolean).join(', '),
    latitude: i.latitude,
    longitude: i.longitude,
  }))
}

export const fetchForecast = (lat: number, lon: number) =>
  get<ForecastResponse>('/weather/forecast', { lat, lon })

export const fetchMarine = (lat: number, lon: number) =>
  get<MarineResponse>('/weather/marine', { lat, lon })

// Moon phase depends only on the date, so cache it across locations (saves the backend rate limit).
const moonCache = new Map<string, Promise<MoonPhase>>()

export function fetchMoonPhase(date: string): Promise<MoonPhase> {
  let p = moonCache.get(date)
  if (!p) {
    p = get<MoonPhase>('/weather/moon-phase', { target_date: date })
    p.catch(() => moonCache.delete(date))
    moonCache.set(date, p)
  }
  return p
}

export const _clearMoonCache = () => moonCache.clear()
