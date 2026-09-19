import { describe, expect, it } from 'vitest'
import { celsiusToFahrenheit, formatTemp, toUnit } from './temperature'

describe('celsiusToFahrenheit', () => {
  it.each([
    [0, 32],
    [100, 212],
    [-40, -40],
    [37, 98.6],
    [-20.4, -4.72],
  ])('%s C = %s F', (c, f) => {
    expect(celsiusToFahrenheit(c)).toBeCloseTo(f, 2)
  })
})

describe('toUnit', () => {
  it('leaves Celsius alone and converts for Fahrenheit', () => {
    expect(toUnit(25, 'C')).toBe(25)
    expect(toUnit(25, 'F')).toBe(77)
  })
})

describe('formatTemp', () => {
  it('rounds to whole degrees with the unit', () => {
    expect(formatTemp(27.6, 'C')).toBe('28°C')
    expect(formatTemp(27.6, 'F')).toBe('82°F') // 81.68
    expect(formatTemp(0, 'F')).toBe('32°F')
  })

  it('rounds the converted value, not the Celsius one', () => {
    expect(formatTemp(30.4, 'F')).toBe('87°F') // 86.72 (30 C would give 86)
  })

  it('supports decimals', () => {
    expect(formatTemp(22.46, 'C', 1)).toBe('22.5°C')
    expect(formatTemp(22.46, 'F', 1)).toBe('72.4°F')
  })

  it('handles negatives', () => {
    expect(formatTemp(-10.7, 'C')).toBe('-11°C')
    expect(formatTemp(-10.7, 'F')).toBe('13°F')
  })

  it('can leave the unit off (compact spots like the forecast card)', () => {
    expect(formatTemp(30.4, 'C', 0, false)).toBe('30°')
    expect(formatTemp(30.4, 'F', 0, false)).toBe('87°')
  })
})
