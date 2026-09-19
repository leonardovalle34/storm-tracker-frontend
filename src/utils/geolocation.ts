const ASKED_KEY = 'st-geo-asked'

export const geolocationSupported = () => typeof navigator !== 'undefined' && !!navigator.geolocation

export function alreadyAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return false
  }
}

export function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export async function permissionGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' })
    return status?.state === 'granted'
  } catch {
    return false
  }
}

export function getPosition(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      () => resolve(null), // denied / unavailable / timeout: stay empty, silently
      { timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  })
}
