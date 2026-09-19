import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as weatherService from '@/services/weatherService'
import { i18n, setLocale } from '@/i18n'
import { useLocationStore } from '@/stores/location'
import { makeForecast, makeMarine } from '@/test/fixtures'
import App from './App.vue'

vi.mock('@/services/weatherService')

const mk = () =>
  mount(App, {
    global: { plugins: [i18n], stubs: { LocationMap: { template: '<div data-testid="map" />' } } },
  })

describe('App', () => {
  beforeEach(() => {
    setLocale('pt')
    vi.mocked(weatherService.getForecast).mockReset()
    vi.mocked(weatherService.getForecast).mockResolvedValue(makeForecast())
    vi.mocked(weatherService.getMarine).mockResolvedValue(makeMarine(false))
    vi.mocked(weatherService.getMoonPhase).mockResolvedValue({
      date: 'x',
      phase_index: 1,
      phase_name: 'New Moon',
    })
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
    vi.mocked(weatherService.getMarine).mockResolvedValue(makeMarine(true))
    const w = mk()
    useLocationStore().selectCoords(-23.9, -46.3)
    await flushPromises()
    const ids = w.findAll('main > section').map((s) => s.attributes('data-section'))
    expect(ids).toEqual(['map', 'forecast', 'wind', 'ocean', 'models'])
    expect(w.findAll('[data-testid="model-frame"]')).toHaveLength(5)
  })

  it('omits ocean grid and ocean maps for non-coastal locations', async () => {
    const w = mk()
    useLocationStore().selectCoords(-15, -47)
    await flushPromises()
    const ids = w.findAll('main > section').map((s) => s.attributes('data-section'))
    expect(ids).toEqual(['map', 'forecast', 'wind', 'models'])
    expect(w.findAll('[data-testid="model-frame"]')).toHaveLength(3)
  })

  it('on first visit, uses the browser geolocation to load weather without any typing', async () => {
    localStorage.clear()
    const getCurrentPosition = vi.fn((ok: (p: unknown) => void) =>
      ok({ coords: { latitude: -23.5, longitude: -46.6 } }),
    )
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
    const w = mk()
    await flushPromises()
    expect(weatherService.getForecast).toHaveBeenCalledWith(-23.5, -46.6)
    expect(weatherService.getMarine).toHaveBeenCalledWith(-23.5, -46.6)
    expect(w.find('[data-testid="day-cards"]').exists()).toBe(true)
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
  })

  it('has exactly one scroll sync toggle (in the forecast header, above the synced boards)', async () => {
    vi.mocked(weatherService.getMarine).mockResolvedValue(makeMarine(true))
    const w = mk()
    useLocationStore().selectCoords(-23.9, -46.3)
    await flushPromises()
    const sync = w.findAll('button[role="switch"]').filter((b) => b.text().includes('Sincronizar rolagem'))
    expect(sync).toHaveLength(1)
    expect(w.get('[data-section="forecast"]').text()).toContain('Sincronizar rolagem')
  })

  it('starts empty, without errors, when there is no geolocation', async () => {
    const w = mk()
    await flushPromises()
    expect(weatherService.getForecast).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(w.text()).toContain('Escolha um local no mapa')
  })

  it('shows an error when the forecast fails', async () => {
    vi.mocked(weatherService.getForecast).mockRejectedValue(new Error('x'))
    const w = mk()
    useLocationStore().selectCoords(1, 1)
    await flushPromises()
    expect(w.text()).toContain('Não foi possível carregar os dados.')
  })
})
