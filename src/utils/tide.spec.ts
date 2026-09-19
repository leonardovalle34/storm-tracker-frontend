import { describe, expect, it } from 'vitest'
import { findExtrema, labelWidth, placeLabels, smoothPath, type LabelBox } from './tide'

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

const overlap = (a: LabelBox, b: LabelBox) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

const FRAME = { width: 700, height: 170, fontSize: 26 }
const mark = (index: number, x: number, y: number, value: number, type: 'peak' | 'valley') => ({
  index,
  x,
  y,
  value,
  type,
  text: `${value.toFixed(2)} m`,
})

describe('placeLabels', () => {
  it('labels every extremum when there is room', () => {
    const marks = [mark(3, 50, 60, 1, 'peak'), mark(9, 250, 100, -1, 'valley'), mark(15, 450, 60, 1, 'peak')]
    expect(placeLabels(marks, FRAME).map((l) => l.index)).toEqual([3, 9, 15])
  })

  it('never lets two labels overlap when extrema are close (peak followed by a nearby valley)', () => {
    const marks = [
      mark(15, 400, 60, 1.2, 'peak'),
      mark(18, 500, 70, 0.9, 'valley'),
      mark(20, 567, 66, 1.1, 'peak'),
      mark(22, 633, 72, 0.8, 'valley'),
    ]
    const placed = placeLabels(marks, FRAME)
    expect(placed.length).toBeGreaterThan(0)
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) expect(overlap(placed[i].box, placed[j].box)).toBe(false)
  })

  it('always keeps the absolute maximum and minimum of the day labeled', () => {
    const marks = [
      mark(3, 50, 90, 0.9, 'peak'),
      mark(5, 117, 92, 0.7, 'valley'),
      mark(7, 183, 40, 1.8, 'peak'), // absolute max
      mark(9, 250, 100, -0.4, 'valley'), // absolute min
      mark(11, 317, 60, 1.0, 'peak'),
    ]
    const ids = placeLabels(marks, FRAME).map((l) => l.index)
    expect(ids).toContain(7)
    expect(ids).toContain(9)
  })

  it('keeps every label inside the frame (x and y) even at the edges', () => {
    const marks = [mark(1, 8, 20, 2, 'peak'), mark(23, 695, 150, -1, 'valley')]
    for (const l of placeLabels(marks, FRAME)) {
      expect(l.box.left).toBeGreaterThanOrEqual(0)
      expect(l.box.right).toBeLessThanOrEqual(FRAME.width)
      expect(l.box.top).toBeGreaterThanOrEqual(0)
      expect(l.box.bottom).toBeLessThanOrEqual(FRAME.height)
    }
  })

  it('defaults to above the dot and moves below when above is taken', () => {
    const [a] = placeLabels([mark(3, 300, 80, 1, 'peak')], FRAME)
    expect(a.y).toBeLessThan(80)
    const two = placeLabels([mark(3, 300, 80, 1.5, 'peak'), mark(4, 320, 80, 1.4, 'peak')], FRAME)
    const byIdx = Object.fromEntries(two.map((l) => [l.index, l]))
    // second label (lower priority) is either relocated below its dot or dropped, never on top of the first
    if (byIdx[4]) expect(byIdx[4].y).toBeGreaterThan(80)
    expect(two.length).toBeGreaterThanOrEqual(1)
  })

  it('estimates label width from text length and font size', () => {
    expect(labelWidth('1.00 m', 26)).toBeGreaterThan(labelWidth('1 m', 26))
    expect(labelWidth('1.00 m', 30)).toBeGreaterThan(labelWidth('1.00 m', 20))
  })
})
