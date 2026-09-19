import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as geocodeService from '@/services/geocodeService'
import type { Location } from '@/types/weather'
import { useLocationStore } from './location'

vi.mock('@/services/geocodeService')
const search = vi.mocked(geocodeService.search)

describe('location store', () => {
  it('starts empty', () => {
    const s = useLocationStore()
    expect(s.location).toBeNull()
    expect(s.detected).toBeNull()
  })

  it('select and selectCoords feed one shared selection', () => {
    const a = useLocationStore()
    const b = useLocationStore()
    a.select({ name: 'Santos', latitude: -23.9, longitude: -46.3 })
    expect(b.location?.name).toBe('Santos')
    b.selectCoords(10.1234567, 20.7654321)
    expect(a.location).toEqual({ name: '10.1235, 20.7654', latitude: 10.1234567, longitude: 20.7654321 })
  })

  describe('search', () => {
    beforeEach(() => {
      search.mockReset()
      search.mockResolvedValue([{ name: 'Santos', latitude: 1, longitude: 2 }])
    })

    it('calls the service and keeps the results', async () => {
      const s = useLocationStore()
      const p = s.search('santos')
      expect(s.searching).toBe(true)
      await p
      expect(search).toHaveBeenCalledWith('santos')
      expect(s.results).toHaveLength(1)
      expect(s.searched).toBe(true)
      expect(s.searching).toBe(false)
    })

    it('resets on failure', async () => {
      search.mockRejectedValue(new Error('boom'))
      const s = useLocationStore()
      await s.search('santos')
      expect(s.results).toEqual([])
      expect(s.searched).toBe(false)
      expect(s.searching).toBe(false)
      expect(s.searchError).toBe('boom')
    })

    it('resets searchError when a new search starts', async () => {
      search.mockRejectedValueOnce(new Error('boom'))
      const s = useLocationStore()
      await s.search('santos')
      await s.search('santos')
      expect(s.searchError).toBeNull()
    })

    it('ignores stale responses', async () => {
      let resolveFirst!: (v: Location[]) => void
      search.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      search.mockResolvedValueOnce([{ name: 'Second', latitude: 0, longitude: 0 }])
      const s = useLocationStore()
      const first = s.search('first')
      await s.search('second')
      resolveFirst([{ name: 'First', latitude: 0, longitude: 0 }])
      await first
      expect(s.results.map((r) => r.name)).toEqual(['Second'])
    })

    it('clearSearch empties the results and drops a search still in flight', async () => {
      const s = useLocationStore()
      await s.search('santos')
      s.clearSearch()
      expect(s.results).toEqual([])
      expect(s.searched).toBe(false)
      const pending = s.search('again')
      s.clearSearch()
      await pending
      expect(s.results).toEqual([])
    })
  })

  describe('detectLocation', () => {
    type Ok = (p: { coords: { latitude: number; longitude: number } }) => void
    type Fail = (e: { code: number }) => void
    const getCurrentPosition = vi.fn()

    function stubGeo(present = true, permission?: string) {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: present ? { getCurrentPosition } : undefined,
      })
      Object.defineProperty(navigator, 'permissions', {
        configurable: true,
        value: permission ? { query: vi.fn().mockResolvedValue({ state: permission }) } : undefined,
      })
    }
    const grant = () =>
      getCurrentPosition.mockImplementation((ok: Ok) => ok({ coords: { latitude: -23.5, longitude: -46.6 } }))
    const deny = () => getCurrentPosition.mockImplementation((_ok: Ok, fail: Fail) => fail({ code: 1 }))

    beforeEach(() => {
      getCurrentPosition.mockReset()
      stubGeo()
    })

    it('selects and records the user position when the permission is granted', async () => {
      grant()
      const s = useLocationStore()
      await s.detectLocation()
      expect(s.location).toMatchObject({ latitude: -23.5, longitude: -46.6 })
      expect(s.detected).toMatchObject({ latitude: -23.5, longitude: -46.6 })
    })

    it('stays empty and silent when denied', async () => {
      deny()
      const s = useLocationStore()
      await expect(s.detectLocation()).resolves.toBeUndefined()
      expect(s.location).toBeNull()
      expect(s.detected).toBeNull()
    })

    it('does nothing when the browser has no geolocation', async () => {
      stubGeo(false)
      const s = useLocationStore()
      await s.detectLocation()
      expect(getCurrentPosition).not.toHaveBeenCalled()
      expect(s.location).toBeNull()
    })

    it('asks only once (no repeated prompts after a denial)', async () => {
      deny()
      const s = useLocationStore()
      await s.detectLocation()
      await s.detectLocation()
      expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    })

    it('on later visits, reuses a permission that is already granted (no prompt involved)', async () => {
      deny()
      const s = useLocationStore()
      await s.detectLocation() // first visit consumed the "ask once"
      stubGeo(true, 'granted')
      grant()
      await s.detectLocation()
      expect(s.location).toMatchObject({ latitude: -23.5 })
    })

    it('on later visits, does not ask when permission is not granted', async () => {
      deny()
      const s = useLocationStore()
      await s.detectLocation()
      getCurrentPosition.mockClear()
      stubGeo(true, 'prompt')
      await s.detectLocation()
      stubGeo(true, 'denied')
      await s.detectLocation()
      expect(getCurrentPosition).not.toHaveBeenCalled()
    })

    it('never overrides a location the user picked while the prompt was open', async () => {
      let answer!: Ok
      getCurrentPosition.mockImplementation((ok: Ok) => (answer = ok))
      const s = useLocationStore()
      const pending = s.detectLocation()
      await vi.waitFor(() => expect(answer).toBeTypeOf('function'))
      s.select({ name: 'Manual', latitude: 1, longitude: 2 })
      answer({ coords: { latitude: -23.5, longitude: -46.6 } })
      await pending
      expect(s.location?.name).toBe('Manual')
      expect(s.detected).toMatchObject({ latitude: -23.5 })
    })
  })
})
