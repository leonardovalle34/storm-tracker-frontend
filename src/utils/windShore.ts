export type ShoreType = 'onshore' | 'offshore' | 'cross'

const angularDiff = (a: number, b: number): number => {
  const d = Math.abs((((a - b) % 360) + 360) % 360)
  return d > 180 ? 360 - d : d
}

/**
 * Classifies the wind relative to the coast. We have no coastline orientation, so the swell direction
 * ("from" bearing) stands in for where the open sea is: wind from that same side (within 45°) pushes
 * onshore, from the opposite side (135° or more away) blows offshore, anything else is cross-shore.
 */
export function windShoreType(windDirection: number, swellDirection: number): ShoreType {
  const diff = angularDiff(windDirection, swellDirection)
  if (diff <= 45) return 'onshore'
  if (diff >= 135) return 'offshore'
  return 'cross'
}
