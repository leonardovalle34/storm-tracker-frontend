import type { Location } from '@/types/weather'

interface GeoJsResponse {
  latitude?: string
  longitude?: string
  city?: string
  country?: string
}

/** Approximate (city-level) position from the IP, for when the browser cannot give one. Null on any failure. */
export async function locate(): Promise<Location | null> {
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json')
    if (!res.ok) return null
    const d = (await res.json()) as GeoJsResponse
    const latitude = Number(d.latitude)
    const longitude = Number(d.longitude)
    if (!d.latitude || !d.longitude || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    return {
      name: [d.city, d.country].filter(Boolean).join(', ') || `${latitude}, ${longitude}`,
      latitude,
      longitude,
    }
  } catch {
    return null
  }
}
