import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/services/api'
import { i18n, setLocale } from '@/i18n'
import { makeForecast } from '@/test/fixtures'
import WindGrid from './WindGrid.vue'

vi.mock('@/services/api')

describe('WindGrid', () => {
  beforeEach(() => {
    setLocale('pt')
    vi.mocked(api.fetchMoonPhase).mockReset()
    vi.mocked(api.fetchMoonPhase).mockResolvedValue({ date: 'x', phase_index: 1, phase_name: 'New Moon' })
  })
  const mk = async () => {
    const w = mount(WindGrid, { props: { hourly: makeForecast().hourly }, global: { plugins: [i18n] } })
    await flushPromises()
    return w
  }

  it('does not carry its own scroll sync toggle (there is a single one, in the forecast header)', async () => {
    expect((await mk()).find('button[role="switch"]').exists()).toBe(false)
  })

  it('is ONE continuous table with the days side by side, scrolling horizontally as a whole', async () => {
    const w = await mk()
    expect(w.findAll('table')).toHaveLength(1)
    expect(w.findAll('[data-testid="wind-day"]')).toHaveLength(0) // no stacked per-day cards
    expect(w.get('[data-testid="wind-scroll"]').classes()).toContain('overflow-x-auto')
    expect(w.get('[data-testid="wind-scroll"]').find('table').exists()).toBe(true)
  })

  it('groups the 7 hour columns of each day under one day header', async () => {
    const w = await mk()
    const heads = w.findAll('[data-testid="day-head"]')
    expect(heads).toHaveLength(2)
    expect(heads.every((h) => h.attributes('colspan') === '7')).toBe(true)
    const hours = w.findAll('[data-testid="hour-head"]')
    expect(hours).toHaveLength(14)
    expect(hours.slice(0, 7).map((c) => c.text())).toEqual(['3h', '6h', '9h', '12h', '15h', '18h', '21h'])
  })

  it('draws a stronger vertical divider at the start of each day only', async () => {
    const w = await mk()
    const hours = w.findAll('[data-testid="hour-head"]')
    const cells = w.findAll('[data-testid="speed-cell"]')
    for (const list of [hours, cells]) {
      list.forEach((c, i) => expect(c.classes().includes('border-l-2'), `col ${i}`).toBe(i % 7 === 0))
    }
    expect(w.findAll('[data-testid="day-head"]').every((h) => h.classes().includes('border-l-2'))).toBe(true)
  })

  it('shows the moon phase once per day, inside the day header, not per hour column', async () => {
    const w = await mk()
    const moons = w.findAll('[data-testid="moon-phase"]')
    expect(moons).toHaveLength(2)
    for (const h of w.findAll('[data-testid="day-head"]')) {
      expect(h.findAll('[data-testid="moon-phase"]')).toHaveLength(1)
    }
    expect(api.fetchMoonPhase).toHaveBeenCalledTimes(2)
  })

  it('colors compact speed cells by intensity with theme token classes (kt)', async () => {
    const w = await mk()
    const cells = w.findAll('[data-testid="speed-cell"]')
    expect(cells).toHaveLength(14)
    // fixtures (knots): 3 calm, 13 moderate, 22 strong, 32 extreme
    expect(cells[0].text()).toBe('3')
    expect(cells[0].classes()).toEqual(expect.arrayContaining(['bg-wind-calm', 'text-wind-calm-fg']))
    expect(cells[1].classes()).toContain('bg-wind-moderate')
    expect(cells[2].classes()).toContain('bg-wind-strong')
    expect(cells[3].classes()).toContain('bg-wind-extreme')
    expect(cells[0].classes()).toContain('text-xs') // dense
  })

  it('direction cells show the rotated arrow AND the cardinal letters', async () => {
    const w = await mk()
    const cells = w.findAll('[data-testid="dir-cell"]')
    // fixtures: hour 3 => 30° (NE, arrow rotate(210deg)), hour 9 => 90° (E)
    expect(cells[0].get('svg').attributes('style')).toContain('rotate(210deg)')
    expect(cells[0].get('[data-testid="cardinal"]').text()).toBe('NE')
    expect(cells[2].get('[data-testid="cardinal"]').text()).toBe('E')
  })

  it('arrows inherit color via currentColor only', async () => {
    const w = await mk()
    const cell = w.findAll('[data-testid="dir-cell"]')[0]
    expect(cell.html()).toContain('currentColor')
    expect(cell.html()).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/)
    expect(cell.classes().some((c) => c.startsWith('text-wind-'))).toBe(true)
  })
})
