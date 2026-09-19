export interface Extremum {
  index: number
  value: number
  type: 'peak' | 'valley'
}

/**
 * Local maxima/minima: a point higher (lower) than its previous neighbour and at least
 * as high (low) as the next. The >= on one side marks a flat plateau only once.
 * First/last points and points next to a null gap are never marked.
 */
export function findExtrema(values: (number | null)[]): Extremum[] {
  const out: Extremum[] = []
  for (let i = 1; i < values.length - 1; i++) {
    const [p, v, n] = [values[i - 1], values[i], values[i + 1]]
    if (p === null || v === null || n === null) continue
    if (v > p && v >= n) out.push({ index: i, value: v, type: 'peak' })
    else if (v < p && v <= n) out.push({ index: i, value: v, type: 'valley' })
  }
  return out
}

export interface Point {
  x: number
  y: number
}

const r = (n: number) => Math.round(n * 100) / 100

/** Smooth SVG path through all points: Catmull-Rom converted to cubic Bézier segments. */
export function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return ''
  let d = `M${r(pts[0].x)} ${r(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`
  }
  return d
}

export interface LabelInput {
  index: number
  x: number
  y: number
  value: number
  type: 'peak' | 'valley'
  text: string
}

export interface LabelBox {
  left: number
  right: number
  top: number
  bottom: number
}

export interface PlacedLabel {
  index: number
  text: string
  x: number
  /** text baseline */
  y: number
  anchor: 'start' | 'middle' | 'end'
  box: LabelBox
}

/** Rough text width (SVG has no measuring without a DOM): ~0.58em per glyph for a semibold sans. */
export const labelWidth = (text: string, fontSize: number): number => text.length * fontSize * 0.58

const overlaps = (a: LabelBox, b: LabelBox, pad: number) =>
  a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad

/**
 * Chooses which extrema get a value label so labels never overlap. Dots are always drawn elsewhere;
 * only labels are dropped. Priority: the day's absolute max and min, then the most prominent
 * remaining ones. Each label tries above its dot, then below; if both collide it is skipped.
 */
export function placeLabels(
  marks: LabelInput[],
  frame: { width: number; height: number; fontSize: number },
): PlacedLabel[] {
  if (!marks.length) return []
  const { width, height, fontSize } = frame
  const gap = 12
  const mean = marks.reduce((s, m) => s + m.value, 0) / marks.length
  const top = marks.reduce((a, b) => (b.value > a.value ? b : a))
  const bottom = marks.reduce((a, b) => (b.value < a.value ? b : a))
  const rest = marks
    .filter((m) => m !== top && m !== bottom)
    .sort((a, b) => Math.abs(b.value - mean) - Math.abs(a.value - mean))
  const order = top === bottom ? [top, ...rest] : [top, bottom, ...rest]

  const placed: PlacedLabel[] = []
  for (const m of order) {
    const w = labelWidth(m.text, fontSize)
    const anchor = m.x - w / 2 < 0 ? 'start' : m.x + w / 2 > width ? 'end' : 'middle'
    const left = anchor === 'start' ? m.x : anchor === 'end' ? m.x - w : m.x - w / 2
    const candidates = [m.y - gap, m.y + gap + fontSize] // above, then below
    for (const baseline of candidates) {
      const box = { left, right: left + w, top: baseline - fontSize, bottom: baseline }
      if (box.top < 0 || box.bottom > height || box.left < 0 || box.right > width) continue
      if (placed.some((p) => overlaps(box, p.box, 4))) continue
      placed.push({ index: m.index, text: m.text, x: m.x, y: baseline, anchor, box })
      break
    }
  }
  return placed.sort((a, b) => a.index - b.index)
}
