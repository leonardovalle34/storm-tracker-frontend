export type UvLevel = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme'

/** WHO UV scale, applied to the index rounded to a whole number: 0-2, 3-5, 6-7, 8-10, 11+. */
export function uvLevel(index: number): UvLevel {
  const v = Math.round(index)
  if (v <= 2) return 'low'
  if (v <= 5) return 'moderate'
  if (v <= 7) return 'high'
  if (v <= 10) return 'veryHigh'
  return 'extreme'
}
