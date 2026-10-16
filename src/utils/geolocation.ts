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

const PERMISSION_DENIED = 1

export type PositionResult =
  | { coords: GeolocationCoordinates }
  | { coords: null; /** GeolocationPositionError.code: 1 denied, 2 unavailable, 3 timeout. */ code: number }

const TIMEOUT_MS = 10_000
const TIMEOUT = 3

/**
 * The API timeout only starts once the permission is settled, and some browsers never answer at all
 * (prompt ignored or suppressed, no location provider), so a hard timer guarantees this resolves and
 * the fallbacks can run.
 */
export function getPosition(): Promise<PositionResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ coords: null, code: TIMEOUT }), TIMEOUT_MS + 5_000)
    const done = (r: PositionResult) => {
      clearTimeout(timer)
      resolve(r)
    }
    navigator.geolocation.getCurrentPosition(
      (p) => done({ coords: p.coords }),
      (e) => done({ coords: null, code: e.code }),
      { timeout: TIMEOUT_MS, maximumAge: 10 * 60_000 },
    )
  })
}

/** The user actually answered (allowed or denied); unavailable / timeout say nothing about their choice. */
export const answered = (r: PositionResult) => r.coords !== null || r.code === PERMISSION_DENIED
