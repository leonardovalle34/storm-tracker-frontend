export type WindUnit = 'kn' | 'km/h'

const KMH_PER_KNOT = 1.852
export const knotsToKmh = (kt: number) => kt * KMH_PER_KNOT

/**
 * DISPLAY ONLY. The API always sends knots; classification and colors (windLevel, classifyWindSeverity,
 * windShoreType, activity scores...) keep using the original knots, never this converted number.
 */
export const toWindUnit = (knots: number, unit: WindUnit) => (unit === 'km/h' ? knotsToKmh(knots) : knots)

/** "12 kt" / "23 km/h" (`withUnit` false gives just the number). Rounds after converting. */
export const formatWind = (knots: number, unit: WindUnit, withUnit = true): string => {
  const n = Math.round(toWindUnit(knots, unit))
  return withUnit ? `${n} ${unit === 'km/h' ? 'km/h' : 'kt'}` : String(n)
}

export type WindLevel = 'calm' | 'moderate' | 'strong' | 'extreme'

/** Intensity bands in knots: <10 calm, <20 moderate, <30 strong, otherwise extreme. */
export function windLevel(knots: number): WindLevel {
  if (knots < 10) return 'calm'
  if (knots < 20) return 'moderate'
  if (knots < 30) return 'strong'
  return 'extreme'
}

/** wind_direction_10m is where the wind comes FROM; the arrow points downwind. */
export const arrowRotation = (fromDeg: number): number => (((fromDeg + 180) % 360) + 360) % 360

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/** 8-point compass letters for a bearing in degrees (0-360, any real number). */
export const cardinal = (deg: number): (typeof CARDINALS)[number] =>
  CARDINALS[((Math.round(deg / 45) % 8) + 8) % 8]
