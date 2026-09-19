import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/services/api'
import { _resetSelectedLocation, useSelectedLocation } from '@/composables/useSelectedLocation'
import { i18n, setLocale } from '@/i18n'
import { makeForecast, makeMarine } from '@/test/fixtures'
import App from './App.vue'

vi.mock('@/services/api')

const mk = () => mount(App, { global: { plugins: [i18n], stubs: { LocationMap: { template: '<div data-testid="map" />' } } } })

describe('App', () => {
  beforeEach(() => {
    setLocale('pt')
    _resetSelectedLocation()
    vi.mocked(api.fetchForecast).mockResolvedValue(makeForecast())
    vi.mocked(api.fetchMarine).mockResolvedValue(makeMarine(false))
    vi.mocked(api.fetchMoonPhase).mockResolvedValue({ date: 'x', phase_index: 1, phase_name: 'New Moon' })
  })

  it('shows header, footer, map and always-on model maps before any selection', () => {
    const w = mk()
    expect(w.find('header').exists()).toBe(true)
    expect(w.find('footer').exists()).toBe(true)
    expect(w.find('[data-testid="map"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="model-frame"]')).toHaveLength(3)
    expect(w.find('[data-testid="day-cards"]').exists()).toBe(false)
  })

  it('renders sections in order: map, forecast, wind, (ocean), models', async () => {
    vi.mocked(api.fetchMarine).mockResolvedValue(makeMarine(true))
    const w = mk()
    useSelectedLocation().selectCoords(-23.9, -46.3)
    await flushPromises()
    const ids = w.findAll('main > section').map((s) => s.attributes('data-section'))
    expect(ids).toEqual(['map', 'forecast', 'wind', 'ocean', 'models'])
    expect(w.findAll('[data-testid="model-frame"]')).toHaveLength(5)
  })

  it('omits ocean grid and ocean maps for non-coastal locations', async () => {
    const w = mk()
    useSelectedLocation().selectCoords(-15, -47)
    await flushPromises()
    const ids = w.findAll('main > section').map((s) => s.attributes('data-section'))
    expect(ids).toEqual(['map', 'forecast', 'wind', 'models'])
    expect(w.findAll('[data-testid="model-frame"]')).toHaveLength(3)
  })

  it('shows an error when the forecast fails', async () => {
    vi.mocked(api.fetchForecast).mockRejectedValue(new Error('x'))
    const w = mk()
    useSelectedLocation().selectCoords(1, 1)
    await flushPromises()
    expect(w.text()).toContain('Não foi possível carregar os dados.')
  })
})
