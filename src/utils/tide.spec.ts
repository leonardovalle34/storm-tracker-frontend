import { describe, expect, it } from 'vitest'
import { findExtrema, smoothPath } from './tide'

describe('findExtrema', () => {
  it('finds local peaks and valleys of a known series', () => {
    //            0  1  2  3  4  5  6  7  8
    const series = [1, 2, 3, 2, 1, 0, 1, 2, 3]
    expect(findExtrema(series)).toEqual([
      { index: 2, value: 3, type: 'peak' },
      { index: 5, value: 0, type: 'valley' },
    ])
  })

  it('a two-cycle tide gives two peaks and two valleys in order', () => {
    const series = Array.from({ length: 24 }, (_, h) => Math.sin((h / 24) * 4 * Math.PI))
    expect(findExtrema(series).map((e) => [e.index, e.type])).toEqual([
      [3, 'peak'],
      [9, 'valley'],
      [15, 'peak'],
      [21, 'valley'],
    ])
  })

  it('never marks the first or last point (needs both neighbours)', () => {
    expect(findExtrema([5, 1, 2, 3, 9])).toEqual([{ index: 1, value: 1, type: 'valley' }])
    expect(findExtrema([1, 2])).toEqual([])
    expect(findExtrema([])).toEqual([])
  })

  it('marks a flat plateau only once', () => {
    expect(findExtrema([0, 1, 1, 0]).map((e) => e.index)).toEqual([1])
  })

  it('ignores monotonic and constant series', () => {
    expect(findExtrema([1, 2, 3, 4])).toEqual([])
    expect(findExtrema([2, 2, 2, 2])).toEqual([])
  })

  it('does not compare across null gaps', () => {
    expect(findExtrema([1, 3, null, 1, 5, 2])).toEqual([{ index: 4, value: 5, type: 'peak' }])
  })
})

describe('smoothPath', () => {
  it('uses cubic Bézier segments through every point', () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ])
    expect(d.startsWith('M0 0')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
    expect(d).not.toContain('L')
    expect(d.trim().endsWith('20 0')).toBe(true)
  })

  it('returns an empty path for fewer than 2 points', () => {
    expect(smoothPath([{ x: 1, y: 1 }])).toBe('')
  })
})
