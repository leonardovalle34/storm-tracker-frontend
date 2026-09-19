import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/services/api'
import { _resetSelectedLocation, useSelectedLocation } from '@/composables/useSelectedLocation'
import { i18n } from '@/i18n'
import LocationSearch from './LocationSearch.vue'

vi.mock('@/services/api')
const geocode = vi.mocked(api.geocode)

describe('LocationSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    _resetSelectedLocation()
    geocode.mockReset()
    geocode.mockResolvedValue([
      { name: 'Santos, SP', latitude: -23.9, longitude: -46.3 },
      { name: 'Santo André, SP', latitude: -23.6, longitude: -46.5 },
    ])
  })
  const mk = () => mount(LocationSearch, { global: { plugins: [i18n] } })

  async function type(w: ReturnType<typeof mk>, text: string) {
    await w.get('input').setValue(text)
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
  }

  it('shows suggestions after debounce and updates the shared location on pick', async () => {
    const w = mk()
    await type(w, 'sant')
    const items = w.findAll('[role="option"]')
    expect(items).toHaveLength(2)
    await items[0].trigger('click')
    expect(useSelectedLocation().location.value?.name).toBe('Santos, SP')
    expect(w.findAll('[role="option"]')).toHaveLength(0)
    expect((w.get('input').element as HTMLInputElement).value).toBe('Santos, SP')
  })

  it('does not re-search after picking', async () => {
    const w = mk()
    await type(w, 'sant')
    await w.findAll('[role="option"]')[0].trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    expect(geocode).toHaveBeenCalledTimes(1)
  })

  it('clears the typed/picked name when the place is then chosen on the map (coordinates)', async () => {
    const w = mk()
    await type(w, 'sant')
    await w.findAll('[role="option"]')[0].trigger('click')
    expect((w.get('input').element as HTMLInputElement).value).toBe('Santos, SP')
    useSelectedLocation().selectCoords(-10.1234, -20.5678)
    await flushPromises()
    expect((w.get('input').element as HTMLInputElement).value).toBe('')
    expect(w.findAll('[role="option"]')).toHaveLength(0)
  })

  it('also clears half-typed text on a map click, without firing a search', async () => {
    const w = mk()
    await w.get('input').setValue('sa')
    useSelectedLocation().selectCoords(1, 2)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect((w.get('input').element as HTMLInputElement).value).toBe('')
    expect(geocode).not.toHaveBeenCalled()
  })

  it('keeps searching normally after a map click cleared the field (no stuck skip flag)', async () => {
    const w = mk()
    useSelectedLocation().selectCoords(1, 2) // input already empty: nothing to clear
    await flushPromises()
    await type(w, 'santos')
    expect(geocode).toHaveBeenCalledTimes(1)
    expect(w.findAll('[role="option"]')).toHaveLength(2)
  })

  it('keeps the name when the location came from this search box', async () => {
    const w = mk()
    await type(w, 'sant')
    await w.findAll('[role="option"]')[1].trigger('click')
    await flushPromises()
    expect((w.get('input').element as HTMLInputElement).value).toBe('Santo André, SP')
  })

  it('shows a no-results message', async () => {
    geocode.mockResolvedValue([])
    const w = mk()
    await type(w, 'zzzz')
    expect(w.text()).toContain(i18n.global.t('header.noResults'))
  })

  it('has combobox semantics and a label', () => {
    const w = mk()
    expect(w.get('input').attributes('role')).toBe('combobox')
    expect(w.get('input').attributes('aria-label')).toBeTruthy()
  })
})
