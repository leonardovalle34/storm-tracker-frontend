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

  it('renders a block per day with 7 hour columns (3h..21h), each day scrolling horizontally', async () => {
    const w = await mk()
    const days = w.findAll('[data-testid="wind-day"]')
    expect(days).toHaveLength(2)
    expect(days[0].findAll('[data-testid="hour-head"]').map((c) => c.text())).toEqual([
      '3h',
      '6h',
      '9h',
      '12h',
      '15h',
      '18h',
      '21h',
    ])
    expect(days[0].get('[data-testid="wind-scroll"]').classes()).toContain('overflow-x-auto')
  })

  it('shows the moon phase once per day header, not per hour column', async () => {
    const w = await mk()
    const days = w.findAll('[data-testid="wind-day"]')
    for (const d of days) {
      expect(d.findAll('[data-testid="moon-phase"]')).toHaveLength(1)
      expect(d.get('header').find('[data-testid="moon-phase"]').exists()).toBe(true)
    }
    expect(api.fetchMoonPhase).toHaveBeenCalledTimes(2)
  })

  it('colors speed cells by intensity with theme token classes (kt)', async () => {
    const w = await mk()
    const cells = w.findAll('[data-testid="wind-day"]')[0].findAll('[data-testid="speed-cell"]')
    // fixtures (knots): 3 calm, 13 moderate, 22 strong, 32 extreme
    expect(cells[0].text()).toBe('3')
    expect(cells[0].classes()).toEqual(expect.arrayContaining(['bg-wind-calm', 'text-wind-calm-fg']))
    expect(cells[1].classes()).toContain('bg-wind-moderate')
    expect(cells[2].classes()).toContain('bg-wind-strong')
    expect(cells[3].classes()).toContain('bg-wind-extreme')
  })

  it('direction arrows rotate downwind and inherit color via currentColor only', async () => {
    const w = await mk()
    const cell = w.findAll('[data-testid="wind-day"]')[0].findAll('[data-testid="dir-cell"]')[0]
    const arrow = cell.get('svg')
    // hour 3 => direction 30 => rotate(210deg)
    expect(arrow.attributes('style')).toContain('rotate(210deg)')
    expect(cell.html()).toContain('currentColor')
    expect(cell.html()).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/)
    expect(cell.classes().some((c) => c.startsWith('text-wind-'))).toBe(true)
  })
})
