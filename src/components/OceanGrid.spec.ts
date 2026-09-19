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

  describe('long-term reliability flag', () => {
    const long = mount(OceanGrid, {
      props: { hourly: makeMarine(true, dayList(16)).hourly },
      global: { plugins: [i18n] },
    })
    it('flags only days 8 to 16 in their day header, keeping their data', () => {
      const heads = long.findAll('[data-testid="day-head"]')
      expect(heads).toHaveLength(16)
      const flagged = heads.map((h) => h.find('[data-testid="long-term"]').exists())
      expect(flagged.slice(0, 7).every((f) => !f)).toBe(true)
      expect(flagged.slice(7).every((f) => f)).toBe(true)
      expect(heads[7].text()).toContain('Estimativa de longo prazo')
      expect(long.findAll('[data-testid="swell-cell"]')).toHaveLength(16 * 7)
    })
  })
})
