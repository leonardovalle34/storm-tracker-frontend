import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { _resetSelectedLocation, useSelectedLocation } from '@/composables/useSelectedLocation'

const h = vi.hoisted(() => {
  const handlers: Record<string, (e: unknown) => void> = {}
  const map: Record<string, ReturnType<typeof vi.fn>> = {}
  map.setView = vi.fn(() => map)
  map.on = vi.fn((ev: string, fn: (e: unknown) => void) => ((handlers[ev] = fn), map))
  map.remove = vi.fn()
  map.invalidateSize = vi.fn()
  map.panTo = vi.fn(() => map)
  const marker = { addTo: vi.fn(() => marker), setLatLng: vi.fn(() => marker) }
  const tile = { addTo: vi.fn() }
  return { handlers, map, marker, tile }
})

vi.mock('leaflet', () => {
  const L = {
    map: vi.fn(() => h.map),
    tileLayer: vi.fn(() => h.tile),
    marker: vi.fn(() => h.marker),
    divIcon: vi.fn(() => ({})),
  }
  return { default: L, ...L }
})

import L from 'leaflet'
import { i18n } from '@/i18n'
import LocationMap from './LocationMap.vue'

const mk = () => mount(LocationMap, { global: { plugins: [i18n] } })

describe('LocationMap', () => {
  beforeEach(() => {
    _resetSelectedLocation()
    vi.clearAllMocks()
  })

  it('renders an Esri World Imagery satellite layer', () => {
    mk()
    expect(L.map).toHaveBeenCalled()
    const [url] = vi.mocked(L.tileLayer).mock.calls[0]
    expect(url).toContain('server.arcgisonline.com/ArcGIS/rest/services/World_Imagery')
    expect(h.tile.addTo).toHaveBeenCalledWith(h.map)
  })

  it('a map click feeds the shared selected location', () => {
    mk()
    h.handlers.click({ latlng: { lat: -23.5, lng: -46.6 } })
    expect(useSelectedLocation().location.value).toMatchObject({ latitude: -23.5, longitude: -46.6 })
  })

  it('a location picked elsewhere (search) moves the marker and view', async () => {
    mk()
    useSelectedLocation().select({ name: 'Santos', latitude: -23.9, longitude: -46.3 })
    await nextTick()
    expect(L.marker).toHaveBeenCalledWith([-23.9, -46.3], expect.anything())
    expect(h.map.setView).toHaveBeenLastCalledWith([-23.9, -46.3], expect.any(Number))
  })

  it('refresh() re-measures the map and recenters on the current location', async () => {
    const w = mk()
    h.map.invalidateSize.mockClear()
    ;(w.vm as unknown as { refresh: () => void }).refresh()
    expect(h.map.invalidateSize).toHaveBeenCalled()
    expect(h.map.panTo).not.toHaveBeenCalled() // nothing selected yet
    useSelectedLocation().select({ name: 'Santos', latitude: -23.9, longitude: -46.3 })
    await nextTick()
    ;(w.vm as unknown as { refresh: () => void }).refresh()
    expect(h.map.panTo).toHaveBeenCalledWith([-23.9, -46.3])
  })

  it('cleans up the map on unmount', () => {
    mk().unmount()
    expect(h.map.remove).toHaveBeenCalled()
  })
})
