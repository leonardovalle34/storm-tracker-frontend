import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { useUnitsStore } from '@/stores/units'
import { makeForecast, makeMarine } from '@/test/fixtures'
import OceanGrid from './OceanGrid.vue'

const dayList = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 8, 19 + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

vi.mock('@/services/weatherService', () => ({
  getMoonPhase: vi.fn().mockResolvedValue({ date: 'x', phase_index: 1, phase_name: 'Full Moon' }),
}))

describe('OceanGrid', () => {
  setLocale('pt')
  const marine = makeMarine(true, dayList(2))
  // day 1, 3h column: the whole 2h-4h window is empty
  for (const i of [2, 3, 4]) {
    marine.hourly.swell_wave_height[i] = null
    marine.hourly.swell_wave_direction[i] = null
  }
  const w = mount(OceanGrid, { props: { hourly: marine.hourly }, global: { plugins: [i18n] } })

  it('shows the water temperature in Fahrenheit (label and values) when chosen', async () => {
    // own mount: the shared `w` above was built while collecting tests, with a different Pinia
    const w = mount(OceanGrid, { props: { hourly: marine.hourly }, global: { plugins: [i18n] } })
    const units = useUnitsStore()
    units.setTemperature('F')
    await w.vm.$nextTick()
    expect(w.text()).toContain('Temp. da água (°F)')
    expect(w.findAll('[data-testid="temp-cell"]')[0].text()).toBe('72.3') // 22.4 C
    units.setTemperature('C')
    await w.vm.$nextTick()
    expect(w.text()).toContain('Temp. da água (°C)')
    expect(w.findAll('[data-testid="temp-cell"]')[0].text()).toBe('22.4')
  })

  it('is one continuous horizontally scrolling table, days side by side', () => {
    expect(w.findAll('table')).toHaveLength(1)
    expect(w.findAll('[data-testid="ocean-day"]')).toHaveLength(0)
    expect(w.get('[data-testid="ocean-scroll"]').classes()).toContain('overflow-x-auto')
    const heads = w.findAll('[data-testid="day-head"]')
    expect(heads).toHaveLength(2)
    expect(heads.every((h) => h.attributes('colspan') === '7')).toBe(true)
    expect(w.findAll('[data-testid="hour-head"]')).toHaveLength(14)
  })

  it('does not carry its own scroll sync toggle (there is a single one, in the forecast header)', () => {
    expect(w.find('button[role="switch"]').exists()).toBe(false)
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

  it('shows the swell height values in bold (and only that row)', () => {
    expect(w.findAll('[data-testid="swell-cell"]').every((c) => c.classes().includes('font-bold'))).toBe(true)
    for (const id of ['period', 'tide', 'temp']) {
      expect(w.get(`[data-testid="${id}-cell"]`).classes()).not.toContain('font-bold')
    }
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

  describe('day summary rows below the data: water clarity and recommended activities', () => {
    const days = dayList(3)
    const mkSummary = (opts: { forecast?: boolean; nullFromDay?: number } = {}) => {
      const h = makeMarine(true, days).hourly
      if (opts.nullFromDay !== undefined) {
        for (const k of [
          'wave_height',
          'swell_wave_height',
          'swell_wave_period',
          'swell_wave_direction',
          'sea_level_height_msl',
          'sea_surface_temperature',
        ] as const) {
          for (let i = opts.nullFromDay * 24; i < h[k].length; i++) h[k][i] = null
        }
      }
      const forecast = makeForecast(days)
      forecast.daily.uv_index_max = [3, 8, 11]
      return mount(OceanGrid, {
        props: { hourly: h, forecast: opts.forecast === false ? null : forecast },
        global: { plugins: [i18n] },
      })
    }

    it('gives each activity its own table row with one roomy cell (7 columns wide) per day', async () => {
      const g = mkSummary()
      await flushPromises()
      const rows = g.findAll('[data-testid="activity-row"]')
      expect(rows.map((r) => r.attributes('data-activity'))).toEqual(['surf', 'kite', 'swimming', 'diving'])
      for (const r of rows) {
        const cells = r.findAll('[data-testid="activity-cell"]')
        expect(cells).toHaveLength(3)
        expect(cells.every((c) => c.attributes('colspan') === '7')).toBe(true)
        expect(r.find('th').text()).toMatch(/Surf|Kite\/Windsurf|Natação|Mergulho/)
      }
      expect(g.text()).toContain('Atividades recomendadas')
    })

    it('does not cram anything into the day header anymore (only date, moon and flag)', async () => {
      const g = mkSummary()
      await flushPromises()
      for (const h of g.findAll('[data-testid="day-head"]')) {
        expect(h.find('[data-testid="activity-badge"]').exists()).toBe(false)
        expect(h.findAll('[data-testid="moon-phase"]')).toHaveLength(1)
      }
    })

    it('does not repeat the UV index in the ocean section (it lives in the 16-day cards)', async () => {
      const g = mkSummary()
      await flushPromises()
      expect(g.find('[data-testid="uv-row"]').exists()).toBe(false)
      expect(g.find('[data-testid="uv-cell"]').exists()).toBe(false)
      expect(g.text()).not.toContain('Índice UV')
    })

    it('has a water clarity row (estimate) per day', async () => {
      const g = mkSummary()
      await flushPromises()
      expect(g.findAll('[data-testid="clarity-cell"]')).toHaveLength(3)
      expect(g.get('[data-testid="clarity-row"] th').text()).toContain('Visibilidade da água')
      expect(g.get('[data-testid="clarity-row"]').html()).toContain('Estimativa')
    })

    it('places clarity and activities BELOW the data rows (after Water temp), not above the grid', async () => {
      const g = mkSummary()
      await flushPromises()
      const after = (a: Element, b: Element) =>
        !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
      const lastData = g.findAll('[data-testid="temp-cell"]').at(-1)!.element
      const firstHour = g.get('[data-testid="hour-head"]').element
      const clarity = g.get('[data-testid="clarity-row"]').element
      const surf = g.get('[data-testid="activity-row"]').element
      expect(after(lastData, clarity)).toBe(true)
      expect(after(clarity, surf)).toBe(true)
      expect(after(surf, firstHour)).toBe(false) // never above the hour header
      expect(after(g.get('[data-testid="tide-chart"]').element, clarity)).toBe(true)
    })

    it('shows a dash instead of activities/clarity for days without marine data', () => {
      const g = mkSummary({ nullFromDay: 1 })
      const rows = g.findAll('[data-testid="activity-row"]')
      expect(rows[0].findAll('[data-testid="activity-cell"]')[2].text()).toBe('–')
      expect(g.findAll('[data-testid="clarity-cell"]')[2].text()).toBe('–')
    })

    it('has no activity or clarity rows without forecast data', () => {
      const g = mkSummary({ forecast: false })
      expect(g.find('[data-testid="activity-row"]').exists()).toBe(false)
      expect(g.find('[data-testid="clarity-row"]').exists()).toBe(false)
    })
  })
})
