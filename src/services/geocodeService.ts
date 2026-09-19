import type { Location } from '@/types/weather'
import { get } from './http'

interface NominatimItem {
  display_name: string
  lat: string
  lon: string
}
interface OpenMeteoGeoItem {
  name: string
  latitude: number
  longitude: number
  country?: string | null
  admin1?: string | null
}

/** The backend proxies Nominatim (array of {display_name, lat, lon}); the {results: [...]} shape is also accepted. */
export async function search(name: string): Promise<Location[]> {
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
