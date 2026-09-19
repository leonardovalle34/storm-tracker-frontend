import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { makeMarine } from '@/test/fixtures'
import OceanGrid from './OceanGrid.vue'

const dayList = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 8, 19 + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

describe('OceanGrid', () => {
  setLocale('pt')
  const marine = makeMarine(true, dayList(2))
  marine.hourly.swell_wave_height[3] = null // day 1, 3h
  marine.hourly.swell_wave_direction[3] = null
  const w = mount(OceanGrid, { props: { hourly: marine.hourly }, global: { plugins: [i18n] } })

  it('is one continuous horizontally scrolling table, days side by side', () => {
    expect(w.findAll('table')).toHaveLength(1)
    expect(w.findAll('[data-testid="ocean-day"]')).toHaveLength(0)
    expect(w.get('[data-testid="ocean-scroll"]').classes()).toContain('overflow-x-auto')
    const heads = w.findAll('[data-testid="day-head"]')
    expect(heads).toHaveLength(2)
    expect(heads.every((h) => h.attributes('colspan') === '7')).toBe(true)
    expect(w.findAll('[data-testid="hour-head"]')).toHaveLength(14)
  })

  it('has a stronger divider between days', () => {
    const cells = w.findAll('[data-testid="swell-cell"]')
    cells.forEach((c, i) => expect(c.classes().includes('border-l-2')).toBe(i % 7 === 0))
  })

  it('has swell height, period, swell direction, tide and water temperature rows', () => {
    const t = w.text()
    for (const label of [
      'Ondulação (m)',
      'Período (s)',
      'Direção da ondulação',
      'Maré (m)',
      'Temp. da água (°C)',
    ]) {
      expect(t).toContain(label)
    }
    const rowOrder = ['swell', 'period', 'swelldir', 'tide', 'temp'].map((id) =>
      w.get(`[data-testid="${id}-cell"]`).element.closest('tr'),
    )
    const trs = [...w.findAll('tbody tr')].map((r) => r.element)
    expect(rowOrder.map((r) => trs.indexOf(r as HTMLTableRowElement))).toEqual([0, 1, 2, 3, 4])
  })

  it('renders the values of each row', () => {
    expect(w.findAll('[data-testid="swell-cell"]')[1].text()).toBe('1.5')
    expect(w.findAll('[data-testid="period-cell"]')[0].text()).toBe('12.3')
    expect(w.findAll('[data-testid="tide-cell"]')[0].text()).toBe('0.25')
    expect(w.findAll('[data-testid="temp-cell"]')[0].text()).toBe('22.4')
  })

  it('shows swell direction as arrow + cardinal letters (same pattern as wind)', () => {
    const cell = w.findAll('[data-testid="swelldir-cell"]')[1]
    expect(cell.get('[data-testid="cardinal"]').text()).toBe('SW') // 225°
    expect(cell.get('svg').attributes('style')).toContain('rotate(45deg)')
    expect(cell.html()).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(/)
  })

  it('shows a dash (no arrow) for null values', () => {
    expect(w.findAll('[data-testid="swell-cell"]')[0].text()).toBe('–')
    const dir = w.findAll('[data-testid="swelldir-cell"]')[0]
    expect(dir.text()).toBe('–')
    expect(dir.find('svg').exists()).toBe(false)
  })

  it('puts one tide curve per day ABOVE the hourly rows, spanning the 7 columns of that day', () => {
    const charts = w.findAll('[data-testid="tide-chart"]')
    expect(charts).toHaveLength(2)
    expect(charts.every((c) => c.attributes('colspan') === '7')).toBe(true)
    const firstRow = w.get('tbody tr').element
    expect(
      charts[0].element.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(w.findAll('[data-testid="tide-chart-svg"]')).toHaveLength(2)
  })

  describe('reliability flag is detected from the data, not fixed at day 8', () => {
    const grid = (nDays: number, nullFrom?: number) => {
      const h = makeMarine(true, dayList(nDays)).hourly
      if (nullFrom !== undefined) {
        for (const k of [
          'wave_height',
          'swell_wave_height',
          'swell_wave_period',
          'swell_wave_direction',
          'sea_level_height_msl',
          'sea_surface_temperature',
        ] as const) {
          for (let i = nullFrom; i < h[k].length; i++) h[k][i] = null
        }
      }
      return mount(OceanGrid, { props: { hourly: h }, global: { plugins: [i18n] } })
    }
    const flags = (g: ReturnType<typeof grid>) =>
      g.findAll('[data-testid="day-head"]').map((h) => h.find('[data-testid="long-term"]').exists())

    it('renders ALL days of the response, including ones that are entirely null', () => {
      const g = grid(16, 24 * 8 + 21)
      expect(g.findAll('[data-testid="day-head"]')).toHaveLength(16)
      expect(g.findAll('[data-testid="hour-head"]')).toHaveLength(112)
      expect(g.findAll('[data-testid="swell-cell"]')).toHaveLength(112)
      expect(g.findAll('[data-testid="tide-chart"]')).toHaveLength(16)
    })

    it('flags from the first day with a null (partial day included), reliable before it', () => {
      const f = flags(grid(16, 24 * 8 + 21))
      expect(f.slice(0, 8).every((x) => !x)).toBe(true)
      expect(f.slice(8).every((x) => x)).toBe(true)
    })

    it('follows the data: a location whose nulls start at day 4 is flagged from day 4', () => {
      const f = flags(grid(16, 24 * 3))
      expect(f.findIndex((x) => x)).toBe(3)
    })

    it('flags nothing when every day has data (no fixed threshold)', () => {
      expect(flags(grid(16)).some((x) => x)).toBe(false)
    })

    it('null cells are "no data available" (dash + title), and empty days say so in the chart slot', () => {
      const g = grid(16, 24 * 8 + 21)
      const last = g.findAll('[data-testid="swell-cell"]')[111]
      expect(last.text()).toBe('–')
      expect(last.attributes('title')).toBe('Sem dado disponível')
      const charts = g.findAll('[data-testid="tide-chart"]')
      expect(charts[15].find('[data-testid="no-data"]').text()).toBe('Sem dados')
      expect(charts[15].find('svg').exists()).toBe(false)
      expect(charts[0].find('svg').exists()).toBe(true)
      expect(charts[0].find('[data-testid="no-data"]').exists()).toBe(false)
    })
  })
})
