import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Location } from '@/types/weather'
import { HISTORY_KEY, MAX_HISTORY, useHistoryStore } from './history'
import { useLocationStore } from './location'

const santos: Location = { name: 'Santos, SP', latitude: -23.96, longitude: -46.33 }
const rio: Location = { name: 'Rio', latitude: -22.9, longitude: -43.2 }
const stored = () => JSON.parse(localStorage.getItem(HISTORY_KEY) ?? 'null')

describe('history store', () => {
  beforeEach(() => localStorage.clear())

  it('uses the storm-track:history key', () => {
    expect(HISTORY_KEY).toBe('storm-track:history')
  })

  it('starts empty', () => {
    expect(useHistoryStore().list).toEqual([])
  })

  it('add puts the most recent first and persists as {name, lat, lon}', () => {
    const s = useHistoryStore()
    s.add(santos)
    s.add(rio)
    expect(s.list).toEqual([rio, santos])
    expect(stored()).toEqual([
      { name: 'Rio', lat: -22.9, lon: -43.2 },
      { name: 'Santos, SP', lat: -23.96, lon: -46.33 },
    ])
  })

  it('does not duplicate: picking a place again moves it to the top', () => {
    const s = useHistoryStore()
    s.add(santos)
    s.add(rio)
    s.add({ ...santos, name: 'Santos (renamed)' })
    expect(s.list.map((l) => l.name)).toEqual(['Santos (renamed)', 'Rio'])
  })

  it('keeps only the 10 most recent', () => {
    const s = useHistoryStore()
    for (let i = 0; i < MAX_HISTORY + 3; i++) s.add({ name: `P${i}`, latitude: i, longitude: i })
    expect(MAX_HISTORY).toBe(10)
    expect(s.list).toHaveLength(10)
    expect(s.list[0].name).toBe('P12')
    expect(s.list[9].name).toBe('P3')
  })

  it('remove drops one entry; clear empties it', () => {
    const s = useHistoryStore()
    s.add(santos)
    s.add(rio)
    s.remove(santos)
    expect(s.list).toEqual([rio])
    s.clear()
    expect(s.list).toEqual([])
    expect(stored()).toEqual([])
  })

  it('restores what was saved and ignores corrupt storage', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([{ name: 'Rio', lat: -22.9, lon: -43.2 }]))
    setActivePinia(createPinia())
    expect(useHistoryStore().list).toEqual([rio])
    localStorage.setItem(HISTORY_KEY, 'nope')
    setActivePinia(createPinia())
    expect(useHistoryStore().list).toEqual([])
  })

  describe('recording selections', () => {
    it('every selection records: search pick (select), map click / geolocation (selectCoords)', () => {
      const loc = useLocationStore()
      const h = useHistoryStore()
      loc.select(santos)
      loc.selectCoords(10.5, 20.25)
      expect(h.list.map((l) => l.name)).toEqual(['10.5000, 20.2500', 'Santos, SP'])
    })

    it('records the position found by the browser geolocation', async () => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (ok: (p: unknown) => void) =>
            ok({ coords: { latitude: -23.5, longitude: -46.6 } }),
        },
      })
      await useLocationStore().detectLocation()
      expect(useHistoryStore().list).toHaveLength(1)
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
    })
  })
})
