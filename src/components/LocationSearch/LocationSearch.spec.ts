import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as geocodeService from '@/services/geocodeService'
import { useFavoritesStore } from '@/stores/favorites'
import { useHistoryStore } from '@/stores/history'
import { useLocationStore } from '@/stores/location'
import { i18n, setLocale } from '@/i18n'
import LocationSearch from './LocationSearch.vue'

vi.mock('@/services/geocodeService')
const geocode = vi.mocked(geocodeService.search)

describe('LocationSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
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
    expect(useLocationStore().location?.name).toBe('Santos, SP')
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
    useLocationStore().selectCoords(-10.1234, -20.5678)
    await flushPromises()
    expect((w.get('input').element as HTMLInputElement).value).toBe('')
    expect(w.get('ul').isVisible()).toBe(false) // closed (the emptied field would list recents on focus)
  })

  it('also clears half-typed text on a map click, without firing a search', async () => {
    const w = mk()
    await w.get('input').setValue('sa')
    useLocationStore().selectCoords(1, 2)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect((w.get('input').element as HTMLInputElement).value).toBe('')
    expect(geocode).not.toHaveBeenCalled()
  })

  it('keeps searching normally after a map click cleared the field (no stuck skip flag)', async () => {
    const w = mk()
    useLocationStore().selectCoords(1, 2) // input already empty: nothing to clear
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

  describe('favorites and recent searches', () => {
    const santos = { name: 'Santos, SP', latitude: -23.9, longitude: -46.3 }
    const rio = { name: 'Rio', latitude: -22.9, longitude: -43.2 }
    const sp = { name: 'São Paulo', latitude: -23.5, longitude: -46.6 }
    beforeEach(() => setLocale('pt'))
    afterEach(() => setLocale('en'))

    it('lists nothing on focus when there are no favorites nor history', async () => {
      const w = mk()
      await w.get('input').trigger('focus')
      expect(w.get('ul').isVisible()).toBe(false)
    })

    it('on focus with an empty field, shows Favorites then Recent searches, with their icons', async () => {
      useFavoritesStore().add(santos)
      useHistoryStore().add(rio)
      const w = mk()
      await w.get('input').trigger('focus')
      const headings = w.findAll('[data-testid^="section-"]')
      expect(headings.map((h) => h.text())).toEqual(['Favoritos', 'Buscas recentes'])
      expect(headings[0].find('[data-testid="icon-star"]').exists()).toBe(true)
      expect(headings[1].find('[data-testid="icon-clock"]').exists()).toBe(true)
      expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['Santos, SP', 'Rio'])
      expect(w.get('ul').isVisible()).toBe(true)
    })

    it('does not repeat a favorite under Recent searches', async () => {
      useFavoritesStore().add(santos)
      useHistoryStore().add(santos)
      useHistoryStore().add(rio)
      const w = mk()
      await w.get('input').trigger('focus')
      expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['Santos, SP', 'Rio'])
    })

    it('picking a saved place selects it', async () => {
      useHistoryStore().add(rio)
      const w = mk()
      await w.get('input').trigger('focus')
      await w.get('[role="option"]').trigger('click')
      expect(useLocationStore().location?.name).toBe('Rio')
    })

    it('typing 3+ characters swaps the sections for the live results', async () => {
      useFavoritesStore().add(rio)
      useHistoryStore().add(sp)
      const w = mk()
      await w.get('input').trigger('focus')
      await type(w, 'sant')
      expect(w.find('[data-testid^="section-"]').exists()).toBe(false)
      expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['Santos, SP', 'Santo André, SP'])
    })

    it('every live result has a star that toggles the favorite without picking it', async () => {
      const w = mk()
      await type(w, 'sant')
      const star = w.findAll('[role="option"]')[0].get('button')
      expect(star.attributes('aria-label')).toBe('Adicionar aos favoritos')
      await star.trigger('click')
      expect(useFavoritesStore().isFavorite({ name: '', latitude: -23.9, longitude: -46.3 })).toBe(true)
      expect(w.findAll('[role="option"]')[0].get('button').attributes('aria-pressed')).toBe('true')
      expect(useLocationStore().location).toBeNull()
      await w.findAll('[role="option"]')[0].get('button').trigger('click')
      expect(useFavoritesStore().list).toEqual([])
    })

    it('un-starring from the Favorites section removes it from the list', async () => {
      useFavoritesStore().add(santos)
      const w = mk()
      await w.get('input').trigger('focus')
      await w.get('[role="option"] button').trigger('click')
      expect(w.find('[data-testid="section-favorites"]').exists()).toBe(false)
    })

    it('arrow keys and Enter work over the saved places', async () => {
      useFavoritesStore().add(santos)
      useHistoryStore().add(rio)
      const w = mk()
      await w.get('input').trigger('focus')
      await w.get('input').trigger('keydown', { key: 'ArrowDown' })
      await w.get('input').trigger('keydown', { key: 'ArrowDown' })
      await w.get('input').trigger('keydown', { key: 'Enter' })
      expect(useLocationStore().location?.name).toBe('Rio')
    })
  })
})
