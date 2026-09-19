import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { makeMarine } from '@/test/fixtures'
import OceanGrid from './OceanGrid.vue'

describe('OceanGrid', () => {
  setLocale('pt')
  const marine = makeMarine(true, ['2026-09-19', '2026-09-20'])
  marine.hourly.swell_wave_height[3] = null
  const w = mount(OceanGrid, { props: { hourly: marine.hourly }, global: { plugins: [i18n] } })

  it('renders a block per day with the 3-hourly columns and horizontal scroll', () => {
    const days = w.findAll('[data-testid="ocean-day"]')
    expect(days).toHaveLength(2)
    expect(days[0].findAll('[data-testid="hour-head"]')).toHaveLength(7)
    expect(days[0].get('[data-testid="ocean-scroll"]').classes()).toContain('overflow-x-auto')
  })

  it('has swell, tide and water temperature rows', () => {
    const first = w.get('[data-testid="ocean-day"]')
    expect(first.text()).toContain('Ondulação (m)')
    expect(first.text()).toContain('Maré (m)')
    expect(first.text()).toContain('Temp. da água (°C)')
    expect(first.findAll('[data-testid="swell-cell"]')[1].text()).toBe('1.5')
    expect(first.findAll('[data-testid="tide-cell"]')[0].text()).toBe('0.25')
    expect(first.findAll('[data-testid="temp-cell"]')[0].text()).toBe('22.4')
  })

  it('shows a dash for null values', () => {
    expect(w.get('[data-testid="ocean-day"]').findAll('[data-testid="swell-cell"]')[0].text()).toBe('–')
  })

  it('puts a tide curve chart above each day grid (grid stays)', () => {
    const day = w.get('[data-testid="ocean-day"]')
    const chart = day.get('[data-testid="tide-chart"]')
    const firstHead = day.get('[data-testid="hour-head"]')
    expect(
      chart.element.compareDocumentPosition(firstHead.element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(day.findAll('[data-testid="swell-cell"]')).toHaveLength(7)
  })

  describe('long-term reliability flag', () => {
    const days = Array.from({ length: 16 }, (_, i) => {
      const d = new Date(2026, 8, 19 + i)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const long = mount(OceanGrid, {
      props: { hourly: makeMarine(true, days).hourly },
      global: { plugins: [i18n] },
    })

    it('flags only days 8 to 16, keeping their data visible', () => {
      const blocks = long.findAll('[data-testid="ocean-day"]')
      expect(blocks).toHaveLength(16)
      const flagged = blocks.map((b) => b.find('[data-testid="long-term"]').exists())
      expect(flagged.slice(0, 7).every((f) => !f)).toBe(true)
      expect(flagged.slice(7).every((f) => f)).toBe(true)
      expect(blocks[7].get('[data-testid="long-term"]').text()).toContain('Estimativa de longo prazo')
      expect(blocks[15].findAll('[data-testid="swell-cell"]')).toHaveLength(7)
    })
  })
})
