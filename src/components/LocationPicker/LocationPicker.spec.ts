import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { useFavoritesStore } from '@/stores/favorites'
import { useLocationStore } from '@/stores/location'
import { useUnitsStore } from '@/stores/units'
import { useWeatherStore } from '@/stores/weather'
import { makeForecast } from '@/test/fixtures'
import { i18n, setLocale } from '@/i18n'
import LocationPicker from './LocationPicker.vue'

const refresh = vi.fn()
const MapStub = defineComponent({
  setup(_p, { expose }) {
    expose({ refresh })
    return () => h('div', { 'data-testid': 'map' })
  },
})

const mk = () => mount(LocationPicker, { global: { plugins: [i18n], stubs: { LocationMap: MapStub } } })
const state = (w: ReturnType<typeof mk>) => w.get('[data-testid="location-picker"]').attributes('data-state')

describe('LocationPicker', () => {
  beforeEach(() => {
    setLocale('pt')
    refresh.mockReset()
  })

  it('starts expanded (no location yet): map and title visible, compact strip hidden', () => {
    const w = mk()
    expect(state(w)).toBe('expanded')
    expect(w.find('[data-testid="map"]').exists()).toBe(true)
    expect(w.text()).toContain('Escolha um local')
    expect(w.get('[data-testid="map-region"]').attributes('inert')).toBeUndefined()
    expect(w.get('[data-testid="location-strip"]').attributes('inert')).toBeDefined()
  })

  it('has a discreet minimize button at the top-right of the open map, which collapses it', async () => {
    const w = mk()
    const btn = w.get('[data-testid="minimize-map"]')
    expect(btn.attributes('aria-label')).toBe('Minimizar mapa')
    expect(btn.attributes('title')).toBe('Minimizar mapa')
    expect(btn.classes()).toEqual(expect.arrayContaining(['absolute', 'right-2', 'top-2', 'h-7', 'w-7']))
    expect(btn.find('svg').exists()).toBe(true)
    await btn.trigger('click')
    expect(state(w)).toBe('collapsed')
    expect(w.get('[data-testid="map-region"]').attributes('inert')).toBeDefined() // unreachable while collapsed
  })

  it('minimizing before choosing a place shows a neutral strip that reopens the map', async () => {
    const w = mk()
    await w.get('[data-testid="minimize-map"]').trigger('click')
    const strip = w.get('[data-testid="location-strip"]')
    expect(strip.text()).toContain('Nenhum local selecionado')
    expect(strip.get('[data-testid="change-location"]').text()).toBe('Escolher local')
    await strip.get('[data-testid="change-location"]').trigger('click')
    expect(state(w)).toBe('expanded')
  })

  it('collapses to a 40px strip with pin + name + "Alterar local" once a location is selected', async () => {
    const w = mk()
    useLocationStore().select({ name: 'Santos, SP', latitude: -23.9, longitude: -46.3 })
    await nextTick()
    expect(state(w)).toBe('collapsed')
    const strip = w.get('[data-testid="location-strip"]')
    expect(strip.attributes('inert')).toBeUndefined()
    expect(strip.get('[data-testid="strip-bar"]').classes()).toContain('h-10')
    expect(strip.find('svg[data-testid="pin-icon"]').exists()).toBe(true)
    expect(strip.text()).toContain('Santos, SP')
    expect(strip.get('[data-testid="change-location"]').text()).toBe('Alterar local')
    // the map stays mounted (marker/position kept) but is not reachable while collapsed
    expect(w.find('[data-testid="map"]').exists()).toBe(true)
    expect(w.get('[data-testid="map-region"]').attributes('inert')).toBeDefined()
    expect(w.get('[data-testid="map-region"]').attributes('aria-hidden')).toBe('true')
  })

  it('collapses for a map click too (coordinates as the name)', async () => {
    const w = mk()
    useLocationStore().selectCoords(-23.5, -46.6)
    await nextTick()
    expect(state(w)).toBe('collapsed')
    expect(w.get('[data-testid="location-strip"]').text()).toContain('-23.5000, -46.6000')
  })

  it('falls back to coordinates when the location has no name', async () => {
    const w = mk()
    useLocationStore().select({ name: '', latitude: 10.5, longitude: 20.25 })
    await nextTick()
    expect(w.get('[data-testid="location-strip"]').text()).toContain('10.5000, 20.2500')
  })

  it('"Alterar local" reopens the map (refreshing it on the current place); picking again collapses', async () => {
    const w = mk()
    const { select } = useLocationStore()
    select({ name: 'Santos', latitude: -23.9, longitude: -46.3 })
    await nextTick()
    await w.get('[data-testid="change-location"]').trigger('click')
    expect(state(w)).toBe('expanded')
    expect(refresh).toHaveBeenCalled()
    expect(w.get('[data-testid="map-region"]').attributes('inert')).toBeUndefined()
    expect(w.get('[data-testid="location-strip"]').attributes('inert')).toBeDefined()

    select({ name: 'Rio', latitude: -22.9, longitude: -43.2 })
    await nextTick()
    expect(state(w)).toBe('collapsed')
    expect(w.get('[data-testid="location-strip"]').text()).toContain('Rio')
  })

  it('picking the same coordinates again also collapses', async () => {
    const w = mk()
    const { selectCoords } = useLocationStore()
    selectCoords(1, 2)
    await nextTick()
    await w.get('[data-testid="change-location"]').trigger('click')
    selectCoords(1, 2)
    await nextTick()
    expect(state(w)).toBe('collapsed')
  })

  it('animates the height smoothly (grid-rows transition, respects reduced motion)', () => {
    const w = mk()
    for (const id of ['map-region-wrap', 'location-strip']) {
      const cls = w.get(`[data-testid="${id}"]`).classes().join(' ')
      expect(cls).toContain('transition-[grid-template-rows]')
      expect(cls).toMatch(/duration-\d+/)
      expect(cls).toContain('motion-reduce:transition-none')
    }
  })

  it('reveals the map wrapper (rows 1fr) when expanded and collapses it (0fr) otherwise', async () => {
    const w = mk()
    expect(w.get('[data-testid="map-region-wrap"]').classes()).toContain('grid-rows-[1fr]')
    expect(w.get('[data-testid="location-strip"]').classes()).toContain('grid-rows-[0fr]')
    useLocationStore().selectCoords(1, 2)
    await nextTick()
    expect(w.get('[data-testid="map-region-wrap"]').classes()).toContain('grid-rows-[0fr]')
    expect(w.get('[data-testid="location-strip"]').classes()).toContain('grid-rows-[1fr]')
  })

  it('refreshes the map when the expand animation ends (Leaflet needs its final size)', async () => {
    const w = mk()
    useLocationStore().selectCoords(1, 2)
    await nextTick()
    await w.get('[data-testid="change-location"]').trigger('click')
    refresh.mockClear()
    await w
      .get('[data-testid="map-region-wrap"]')
      .trigger('transitionend', { propertyName: 'grid-template-rows' })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  describe('favorite star on the strip', () => {
    it('is hidden until a place is selected', () => {
      expect(mk().find('[data-testid="location-strip"] [aria-pressed]').exists()).toBe(false)
    })

    it('toggles the favorite of the current place', async () => {
      const w = mk()
      useLocationStore().select({ name: 'Santos', latitude: -23.9, longitude: -46.3 })
      await nextTick()
      const star = w.get('[data-testid="location-strip"] [aria-pressed]')
      expect(star.attributes('aria-pressed')).toBe('false')
      await star.trigger('click')
      expect(star.attributes('aria-pressed')).toBe('true')
      expect(useFavoritesStore().list.map((p) => p.name)).toEqual(['Santos'])
      await star.trigger('click')
      expect(useFavoritesStore().list).toEqual([])
    })
  })

  describe('current weather on the strip', () => {
    const pick = async (current?: unknown) => {
      const w = mk()
      useWeatherStore().forecast = { ...makeForecast(), current } as never
      useLocationStore().select({ name: 'Santos', latitude: -23.9, longitude: -46.3 })
      await nextTick()
      return w
    }

    it('shows icon, temperature and wind from `current`', async () => {
      const w = await pick({ temperature_2m: 27.6, weather_code: 63, wind_speed_10m: 12.4 })
      expect(w.get('[data-testid="current-icon"]').text()).toBe('🌧️')
      expect(w.get('[data-testid="current-icon"]').attributes('title')).toBe('Chuva')
      expect(w.get('[data-testid="current-temp"]').text()).toBe('28°C')
      expect(w.get('[data-testid="current-wind"]').text()).toContain('12 kt')
    })

    it('sits in a row at the bottom of the collapsed strip, under the name bar', async () => {
      const w = await pick({ temperature_2m: 20, weather_code: 0, wind_speed_10m: 5 })
      const card = w.get('[data-testid="strip-card"]')
      const children = [...card.element.children].map((c) => c.getAttribute('data-testid'))
      expect(children).toEqual(['strip-bar', 'current-weather'])
      expect(w.get('[data-testid="strip-bar"]').find('[data-testid="current-weather"]').exists()).toBe(false)
    })

    it('is also shown under the map while it is open', async () => {
      const w = await pick({ temperature_2m: 20, weather_code: 0, wind_speed_10m: 5 })
      await w.get('[data-testid="change-location"]').trigger('click')
      expect(state(w)).toBe('expanded')
      const open = w.get('[data-testid="map-region"]')
      expect(open.get('[data-testid="current-temp"]').text()).toBe('20°C')
      expect(open.attributes('inert')).toBeUndefined()
      // same box as the map: the row is inside the bordered card, after the map, not floating outside it
      const card = open.get('[data-testid="current-weather"]').element.parentElement!
      expect(card.className).toContain('border')
      expect(card.querySelector('[role="application"], [data-testid="map"]')).not.toBeNull()
    })

    it('shows the temperature in Fahrenheit when chosen (27.6 C = 82 F)', async () => {
      const w = await pick({ temperature_2m: 27.6, weather_code: 0, wind_speed_10m: 5 })
      useUnitsStore().setTemperature('F')
      await nextTick()
      expect(w.get('[data-testid="current-temp"]').text()).toBe('82°F')
    })

    it('says it is the current condition, in both the strip and the open map', async () => {
      const w = await pick({ temperature_2m: 20, weather_code: 0, wind_speed_10m: 5 })
      const labels = w.findAll('[data-testid="current-label"]')
      expect(labels).toHaveLength(2) // strip + under the map
      expect(labels[0].text()).toBe('Agora')
      expect(labels[0].attributes('title')).toBe('Condições atuais')
      expect(labels[0].element.nextElementSibling?.getAttribute('data-testid')).toBe('current-icon') // before the values
    })

    it('omits the whole weather part when `current` is absent (older backend)', async () => {
      expect((await pick(undefined)).find('[data-testid="current-weather"]').exists()).toBe(false)
      expect((await pick(null)).find('[data-testid="current-weather"]').exists()).toBe(false)
      expect((await pick({})).find('[data-testid="current-weather"]').exists()).toBe(false)
    })

    it('omits only the pieces that are missing', async () => {
      const w = await pick({ temperature_2m: 20, weather_code: null, wind_speed_10m: null })
      expect(w.find('[data-testid="current-temp"]').exists()).toBe(true)
      expect(w.find('[data-testid="current-wind"]').exists()).toBe(false)
    })

    it('shows nothing before a place is selected', () => {
      useWeatherStore().forecast = { ...makeForecast(), current: { temperature_2m: 20 } } as never
      expect(mk().find('[data-testid="current-weather"]').exists()).toBe(false)
    })
  })
})
