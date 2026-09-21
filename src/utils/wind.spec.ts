import { describe, expect, it } from 'vitest'
import { arrowRotation, cardinal, formatWind, knotsToKmh, toWindUnit, windLevel } from './wind'

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

describe('wind unit conversion (display only)', () => {
  it('knotsToKmh uses 1 kt = 1.852 km/h', () => {
    expect(knotsToKmh(0)).toBe(0)
    expect(knotsToKmh(10)).toBeCloseTo(18.52)
    expect(knotsToKmh(54)).toBeCloseTo(100.008)
  })

  it('toWindUnit leaves knots alone and converts for km/h', () => {
    expect(toWindUnit(20, 'kn')).toBe(20)
    expect(toWindUnit(20, 'km/h')).toBeCloseTo(37.04)
  })

  it('formatWind rounds AFTER converting, with or without the unit', () => {
    expect(formatWind(12.4, 'kn')).toBe('12 kt')
    expect(formatWind(12.4, 'km/h')).toBe('23 km/h') // 22.96
    expect(formatWind(12.4, 'kn', false)).toBe('12')
    expect(formatWind(12.4, 'km/h', false)).toBe('23')
    expect(formatWind(0, 'km/h')).toBe('0 km/h')
  })

  it('does not change the classification: windLevel stays defined on the knots value', () => {
    // 9 kt is calm (< 10) even though its km/h number (16.7) would be "moderate" if misread as knots
    expect(windLevel(9)).toBe('calm')
    expect(windLevel(toWindUnit(9, 'kn'))).toBe('calm')
  })
})
