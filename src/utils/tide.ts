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
