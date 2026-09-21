import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as weatherService from '@/services/weatherService'
import { i18n, setLocale } from '@/i18n'
import { useUnitsStore } from '@/stores/units'
import { makeForecast } from '@/test/fixtures'
import WindGrid from './WindGrid.vue'

vi.mock('@/services/weatherService')

describe('WindGrid', () => {
  beforeEach(() => {
    setLocale('pt')
    vi.mocked(weatherService.getMoonPhase).mockReset()
    vi.mocked(weatherService.getMoonPhase).mockResolvedValue({
      date: 'x',
      phase_index: 1,
      phase_name: 'New Moon',
    })
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

  it('renders a gust row right below the sustained wind row, colored with the same scale', async () => {
    const w = await mk()
    const rows = w.findAll('tbody tr')
    expect(rows[1].get('th').text()).toBe('Rajada (nós)')
    expect(rows[0].get('th').text()).toBe('Vento (nós)')
    const gusts = w.findAll('[data-testid="gust-cell"]')
    expect(gusts).toHaveLength(14)
    expect(gusts.slice(0, 4).map((c) => c.text())).toEqual(['8', '19', '29', '41'])
    expect(gusts[0].classes()).toContain('bg-wind-calm')
    expect(gusts[1].classes()).toContain('bg-wind-moderate')
    expect(gusts[2].classes()).toContain('bg-wind-strong')
    expect(gusts[3].classes()).toContain('bg-wind-extreme')
  })

  describe('wind unit toggle (display only)', () => {
    it('labels both rows with the active unit', async () => {
      const w = await mk()
      const heads = () => w.findAll('tbody th').map((h) => h.text())
      expect(heads().slice(0, 2)).toEqual(['Vento (nós)', 'Rajada (nós)'])
      useUnitsStore().setWindUnit('km/h')
      await w.vm.$nextTick()
      expect(heads().slice(0, 2)).toEqual(['Vento (km/h)', 'Rajada (km/h)'])
      setLocale('en')
      await w.vm.$nextTick()
      expect(heads().slice(0, 2)).toEqual(['Wind (km/h)', 'Gust (km/h)'])
      useUnitsStore().setWindUnit('kn')
      await w.vm.$nextTick()
      expect(heads().slice(0, 2)).toEqual(['Wind (kt)', 'Gust (kt)'])
      setLocale('pt')
    })

    it('shows speed and gust converted to km/h (kn x 1.852, rounded)', async () => {
      const w = await mk()
      useUnitsStore().setWindUnit('km/h')
      await w.vm.$nextTick()
      // fixtures (knots): speed 3, 13, 22, 32 / gust 8, 19, 29, 41
      expect(
        w
          .findAll('[data-testid="speed-cell"]')
          .slice(0, 4)
          .map((c) => c.text()),
      ).toEqual(['6', '24', '41', '59'])
      expect(
        w
          .findAll('[data-testid="gust-cell"]')
          .slice(0, 4)
          .map((c) => c.text()),
      ).toEqual(['15', '35', '54', '76'])
    })

    it('colors and level tooltips keep following the ORIGINAL knots, not the converted number', async () => {
      const w = await mk()
      const snapshot = () =>
        [...w.findAll('[data-testid="speed-cell"]'), ...w.findAll('[data-testid="gust-cell"]')].map((c) => [
          c.classes().filter((k) => k.startsWith('bg-wind-')),
          c.attributes('title'),
        ])
      const inKnots = snapshot()
      useUnitsStore().setWindUnit('km/h')
      await w.vm.$nextTick()
      expect(snapshot()).toEqual(inKnots)
      // 3 kt shows "6" (km/h) and stays calm; 13 kt shows "24" and stays moderate (not "strong" for >= 20)
      const cells = w.findAll('[data-testid="speed-cell"]')
      expect(cells[0].classes()).toContain('bg-wind-calm')
      expect(cells[1].text()).toBe('24')
      expect(cells[1].classes()).toContain('bg-wind-moderate')
    })
  })

  it('omits the gust row when the backend sends no gust data', async () => {
    const hourly = { ...makeForecast().hourly, wind_gusts_10m: undefined }
    const w = mount(WindGrid, { props: { hourly }, global: { plugins: [i18n] } })
    await flushPromises()
    expect(w.findAll('[data-testid="gust-cell"]')).toHaveLength(0)
  })

  it('shows the moon phase once per day, inside the day header, not per hour column', async () => {
    const w = await mk()
    const moons = w.findAll('[data-testid="moon-phase"]')
    expect(moons).toHaveLength(2)
    for (const h of w.findAll('[data-testid="day-head"]')) {
      expect(h.findAll('[data-testid="moon-phase"]')).toHaveLength(1)
    }
    expect(weatherService.getMoonPhase).toHaveBeenCalledTimes(2)
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
