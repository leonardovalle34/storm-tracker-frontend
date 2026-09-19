import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Location } from '@/types/weather'
import { FAVORITES_KEY, MAX_FAVORITES, useFavoritesStore } from './favorites'

const santos: Location = { name: 'Santos, SP', latitude: -23.96, longitude: -46.33 }
const rio: Location = { name: 'Rio', latitude: -22.9, longitude: -43.2 }
const stored = () => JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? 'null')

describe('favorites store', () => {
  beforeEach(() => localStorage.clear())

  it('uses the storm-track:favorites key', () => {
    expect(FAVORITES_KEY).toBe('storm-track:favorites')
  })

  it('starts empty', () => {
    expect(useFavoritesStore().list).toEqual([])
  })

  it('add puts the place first and persists it as {name, lat, lon}', () => {
    const s = useFavoritesStore()
    s.add(santos)
    s.add(rio)
    expect(s.list).toEqual([rio, santos])
    expect(stored()).toEqual([
      { name: 'Rio', lat: -22.9, lon: -43.2 },
      { name: 'Santos, SP', lat: -23.96, lon: -46.33 },
    ])
  })

  it('does not duplicate the same place (same coordinates, whatever the name)', () => {
    const s = useFavoritesStore()
    s.add(santos)
    s.add({ ...santos, name: 'Other name' })
    expect(s.list).toHaveLength(1)
  })

  it('isFavorite matches by coordinates', () => {
    const s = useFavoritesStore()
    s.add(santos)
    expect(s.isFavorite(santos)).toBe(true)
    expect(s.isFavorite({ name: 'x', latitude: -23.96, longitude: -46.33 })).toBe(true)
    expect(s.isFavorite(rio)).toBe(false)
  })

  it('remove drops it and persists', () => {
    const s = useFavoritesStore()
    s.add(santos)
    s.add(rio)
    s.remove(santos)
    expect(s.list).toEqual([rio])
    expect(stored()).toHaveLength(1)
    s.remove(rio)
    expect(stored()).toEqual([])
  })

  it('remove of something that is not a favorite is a no-op', () => {
    const s = useFavoritesStore()
    s.add(santos)
    s.remove(rio)
    expect(s.list).toEqual([santos])
  })

  it('toggle adds, then removes', () => {
    const s = useFavoritesStore()
    s.toggle(santos)
    expect(s.isFavorite(santos)).toBe(true)
    s.toggle(santos)
    expect(s.isFavorite(santos)).toBe(false)
  })

  it('caps the list, dropping the oldest', () => {
    const s = useFavoritesStore()
    for (let i = 0; i <= MAX_FAVORITES; i++) s.add({ name: `P${i}`, latitude: i, longitude: i })
    expect(s.list).toHaveLength(MAX_FAVORITES)
    expect(s.list[0].name).toBe(`P${MAX_FAVORITES}`)
    expect(s.isFavorite({ name: 'P0', latitude: 0, longitude: 0 })).toBe(false)
  })

  it('restores what was saved', () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([{ name: 'Rio', lat: -22.9, lon: -43.2 }]))
    setActivePinia(createPinia())
    expect(useFavoritesStore().list).toEqual([rio])
  })

  it('ignores corrupt or malformed storage', () => {
    localStorage.setItem(FAVORITES_KEY, '{not json')
    setActivePinia(createPinia())
    expect(useFavoritesStore().list).toEqual([])
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify([{ name: 'ok', lat: 1, lon: 2 }, { name: 3 }, null, 'x']),
    )
    setActivePinia(createPinia())
    expect(useFavoritesStore().list).toEqual([{ name: 'ok', latitude: 1, longitude: 2 }])
  })
})
