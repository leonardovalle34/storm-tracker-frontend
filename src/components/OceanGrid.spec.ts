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
})
