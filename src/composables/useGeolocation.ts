import { useSelectedLocation } from './useSelectedLocation'

const ASKED_KEY = 'st-geo-asked'

function alreadyAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return false
  }
}

function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
}

async function permissionGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' })
    return status?.state === 'granted'
  } catch {
    return false
  }
}

function getPosition(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      () => resolve(null), // denied / unavailable / timeout: stay empty, silently
      { timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  })
}

/**
 * First visit: ask the browser once and, if allowed, select the user's position (which triggers
 * the forecast/marine load through the shared location state). Later visits only reuse a permission
 * the browser already granted, so there is never a repeated prompt. Never overrides a place the
 * user picked in the meantime and never throws.
 */
export async function requestInitialLocation(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return
  const { location, selectCoords } = useSelectedLocation()
  if (alreadyAsked() && !(await permissionGranted())) return
  markAsked()
  const coords = await getPosition()
  if (coords && !location.value) selectCoords(coords.latitude, coords.longitude)
}
