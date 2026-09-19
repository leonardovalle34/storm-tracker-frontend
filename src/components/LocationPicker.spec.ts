import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { _resetSelectedLocation, useSelectedLocation } from '@/composables/useSelectedLocation'
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
    _resetSelectedLocation()
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

  it('collapses to a 40px strip with pin + name + "Alterar local" once a location is selected', async () => {
    const w = mk()
    useSelectedLocation().select({ name: 'Santos, SP', latitude: -23.9, longitude: -46.3 })
    await nextTick()
    expect(state(w)).toBe('collapsed')
    const strip = w.get('[data-testid="location-strip"]')
    expect(strip.attributes('inert')).toBeUndefined()
    expect(strip.get('[data-testid="strip-bar"]').classes()).toContain('h-10')
    expect(strip.find('svg[data-testid="pin-icon"]').exists()).toBe(true)
    expect(strip.text()).toContain('Santos, SP')
    expect(strip.get('button').text()).toBe('Alterar local')
    // the map stays mounted (marker/position kept) but is not reachable while collapsed
    expect(w.find('[data-testid="map"]').exists()).toBe(true)
    expect(w.get('[data-testid="map-region"]').attributes('inert')).toBeDefined()
    expect(w.get('[data-testid="map-region"]').attributes('aria-hidden')).toBe('true')
  })

  it('collapses for a map click too (coordinates as the name)', async () => {
    const w = mk()
    useSelectedLocation().selectCoords(-23.5, -46.6)
    await nextTick()
    expect(state(w)).toBe('collapsed')
    expect(w.get('[data-testid="location-strip"]').text()).toContain('-23.5000, -46.6000')
  })

  it('falls back to coordinates when the location has no name', async () => {
    const w = mk()
    useSelectedLocation().select({ name: '', latitude: 10.5, longitude: 20.25 })
    await nextTick()
    expect(w.get('[data-testid="location-strip"]').text()).toContain('10.5000, 20.2500')
  })

  it('"Alterar local" reopens the map (refreshing it on the current place); picking again collapses', async () => {
    const w = mk()
    const { select } = useSelectedLocation()
    select({ name: 'Santos', latitude: -23.9, longitude: -46.3 })
    await nextTick()
    await w.get('[data-testid="location-strip"] button').trigger('click')
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
    const { selectCoords } = useSelectedLocation()
    selectCoords(1, 2)
    await nextTick()
    await w.get('[data-testid="location-strip"] button').trigger('click')
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
    useSelectedLocation().selectCoords(1, 2)
    await nextTick()
    expect(w.get('[data-testid="map-region-wrap"]').classes()).toContain('grid-rows-[0fr]')
    expect(w.get('[data-testid="location-strip"]').classes()).toContain('grid-rows-[1fr]')
  })

  it('refreshes the map when the expand animation ends (Leaflet needs its final size)', async () => {
    const w = mk()
    useSelectedLocation().selectCoords(1, 2)
    await nextTick()
    await w.get('[data-testid="location-strip"] button').trigger('click')
    refresh.mockClear()
    await w
      .get('[data-testid="map-region-wrap"]')
      .trigger('transitionend', { propertyName: 'grid-template-rows' })
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
