import { describe, expect, it } from 'vitest'
import { arrowRotation, cardinal, windLevel } from './wind'

describe('wind utils', () => {
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

  it.each([
    [0, 'N'],
    [22.4, 'N'],
    [22.5, 'NE'],
    [45, 'NE'],
    [90, 'E'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
    [337.4, 'NW'],
    [337.5, 'N'],
    [360, 'N'],
    [-45, 'NW'],
    [405, 'NE'],
  ])('%s° is %s', (deg, sigla) => {
    expect(cardinal(deg)).toBe(sigla)
  })
})
