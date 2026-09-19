import { describe, expect, it } from 'vitest'
import { arrowRotation, kmhToKnots, windLevel } from './wind'

describe('wind utils', () => {
  it('converts km/h to knots', () => {
    expect(kmhToKnots(18.52)).toBeCloseTo(10, 5)
    expect(kmhToKnots(0)).toBe(0)
  })

  it.each([
    [0, 'calm'],
    [9.9, 'calm'],
    [10, 'moderate'],
    [19.9, 'moderate'],
    [20, 'strong'],
    [29.9, 'strong'],
    [30, 'extreme'],
    [60, 'extreme'],
  ])('%s kt is %s', (kt, level) => {
    expect(windLevel(kt)).toBe(level)
  })

  it('arrow points downwind (from-direction + 180)', () => {
    expect(arrowRotation(0)).toBe(180)
    expect(arrowRotation(90)).toBe(270)
    expect(arrowRotation(270)).toBe(90)
    expect(arrowRotation(180)).toBe(0)
  })
})
