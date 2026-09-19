import { describe, expect, it } from 'vitest'
import { uvLevel } from './uv'

describe('uvLevel (WHO scale, on the rounded index)', () => {
  it.each([
    [0, 'low'],
    [2, 'low'],
    [2.4, 'low'],
    [2.5, 'moderate'], // rounds to 3
    [5, 'moderate'],
    [6, 'high'],
    [7.4, 'high'],
    [8, 'veryHigh'],
    [10, 'veryHigh'],
    [11, 'extreme'],
    [14, 'extreme'],
  ])('UV %s is %s', (v, level) => {
    expect(uvLevel(v)).toBe(level)
  })
})
