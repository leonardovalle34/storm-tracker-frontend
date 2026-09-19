export type WindLevel = 'calm' | 'moderate' | 'strong' | 'extreme'

export const kmhToKnots = (kmh: number): number => kmh / 1.852

/** Intensity bands in knots: <10 calm, <20 moderate, <30 strong, otherwise extreme. */
export function windLevel(knots: number): WindLevel {
  if (knots < 10) return 'calm'
  if (knots < 20) return 'moderate'
  if (knots < 30) return 'strong'
  return 'extreme'
}

/** wind_direction_10m is where the wind comes FROM; the arrow points downwind. */
export const arrowRotation = (fromDeg: number): number => (((fromDeg + 180) % 360) + 360) % 360
