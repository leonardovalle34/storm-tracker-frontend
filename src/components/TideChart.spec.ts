import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import TideChart from './TideChart.vue'

// 24 hourly values (index = hour): peaks at 3h/15h (+1 m), valleys at 9h/21h (-1 m)
const series = Array.from({ length: 24 }, (_, h) => Math.sin((h / 24) * 4 * Math.PI))
const mk = (s: (number | null)[] = series) => mount(TideChart, { props: { series: s }, global: { plugins: [i18n] } })

describe('TideChart', () => {
  setLocale('pt')

  it('draws a smooth curve (Bézier) and a gradient fill under it', () => {
    const w = mk()
    const line = w.get('[data-testid="tide-line"]')
    expect(line.attributes('d')).toContain('C')
    expect(line.attributes('d')).not.toContain('L')
    expect(w.find('linearGradient').exists()).toBe(true)
    const gradId = w.get('linearGradient').attributes('id')!
    expect(w.get('[data-testid="tide-area"]').attributes('fill')).toBe(`url(#${gradId})`)
  })

  it('marks every peak and valley with a dot and its value in meters above the dot', () => {
    const w = mk()
    const marks = w.findAll('[data-testid="tide-extreme"]')
    expect(marks).toHaveLength(4)
    expect(marks.map((m) => m.attributes('data-type'))).toEqual(['peak', 'valley', 'peak', 'valley'])
    expect(marks.map((m) => m.get('text').text())).toEqual(['1.00 m', '-1.00 m', '1.00 m', '-1.00 m'])
    for (const m of marks) {
      expect(m.find('circle').exists()).toBe(true)
      expect(Number(m.get('text').attributes('y'))).toBeLessThan(Number(m.get('circle').attributes('cy')))
    }
  })

  it('aligns the hour axis with the 7 grid columns (3h..21h at column centers)', () => {
    const w = mk()
    const labels = w.findAll('[data-testid="tide-hour"]')
    expect(labels.map((l) => l.text())).toEqual(['3h', '6h', '9h', '12h', '15h', '18h', '21h'])
    // viewBox is 7 columns wide; each column is 100 units, centers at 50, 150, ...
    expect(w.get('svg').attributes('viewBox')?.split(' ')[2]).toBe('700')
    expect(labels.map((l) => Number(l.attributes('x')))).toEqual([50, 150, 250, 350, 450, 550, 650])
    // hour 3 data point sits exactly on the 3h label
    expect(Number(w.get('[data-testid="tide-extreme"] circle').attributes('cx'))).toBeCloseTo(50, 5)
  })

  it('is responsive: scales with its container instead of a fixed size', () => {
    const svg = mk().get('svg')
    expect(svg.attributes('width')).toBeUndefined()
    expect(svg.classes()).toContain('w-full')
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toBe('Curva de maré')
  })

  it('uses the ocean teal token, never a fixed color', () => {
    const html = mk().html()
    expect(html).toMatch(/ocean/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/)
  })

  it('renders nothing without enough data', () => {
    expect(mk([null, null, 1, null]).find('svg').exists()).toBe(false)
    expect(mk([]).find('svg').exists()).toBe(false)
  })

  it('gives each instance its own gradient id', () => {
    expect(mk().get('linearGradient').attributes('id')).not.toBe(mk().get('linearGradient').attributes('id'))
  })
})
