import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as geocodeService from '@/services/geocodeService'
import * as ipLocationService from '@/services/ipLocationService'
import type { Location } from '@/types/weather'
import { useFavoritesStore } from './favorites'
import { useLocationStore } from './location'

vi.mock('@/services/geocodeService')
vi.mock('@/services/ipLocationService')
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

    const fail = (code: number) =>
      getCurrentPosition.mockImplementation((_ok: Ok, f: Fail) => f({ code }))

    beforeEach(() => {
      getCurrentPosition.mockReset()
      vi.mocked(ipLocationService.locate).mockReset().mockResolvedValue(null)
      vi.spyOn(console, 'warn').mockImplementation(() => {})
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

    it('retries on the next visit when the browser could not answer (unavailable / timeout)', async () => {
      fail(2)
      const s = useLocationStore()
      await s.detectLocation()
      stubGeo(true, 'granted')
      grant()
      await s.detectLocation()
      expect(getCurrentPosition).toHaveBeenCalledTimes(2)
      expect(s.location).toMatchObject({ latitude: -23.5 })
    })

    it('falls back to the favorite when the browser never answers at all', async () => {
      vi.useFakeTimers()
      try {
        getCurrentPosition.mockImplementation(() => {}) // hangs: prompt ignored / no provider
        useFavoritesStore().add({ name: 'Pico', latitude: -23.9, longitude: -46.3 })
        const s = useLocationStore()
        const pending = s.detectLocation()
        await vi.advanceTimersByTimeAsync(20_000)
        await pending
        expect(s.location?.name).toBe('Pico')
      } finally {
        vi.useRealTimers()
      }
    })

    describe('fallbacks when the browser gives no position', () => {
      const fav: Location = { name: 'Pico', latitude: -23.9, longitude: -46.3 }
      const byIp: Location = { name: 'Santos, Brazil', latitude: -23.96, longitude: -46.33 }

      it('selects the most recent favorite', async () => {
        fail(1)
        useFavoritesStore().add({ name: 'Old', latitude: 1, longitude: 1 })
        useFavoritesStore().add(fav)
        const s = useLocationStore()
        await s.detectLocation()
        expect(s.location).toEqual(fav)
        expect(s.detected).toBeNull()
        expect(ipLocationService.locate).not.toHaveBeenCalled()
      })

      it('uses the favorite when the browser has no geolocation at all', async () => {
        stubGeo(false)
        useFavoritesStore().add(fav)
        const s = useLocationStore()
        await s.detectLocation()
        expect(s.location).toEqual(fav)
      })

      it('falls back to the IP position when there is no favorite', async () => {
        fail(2)
        vi.mocked(ipLocationService.locate).mockResolvedValue(byIp)
        const s = useLocationStore()
        await s.detectLocation()
        expect(s.location).toEqual(byIp)
      })

      it('stays empty when every fallback fails', async () => {
        fail(1)
        const s = useLocationStore()
        await s.detectLocation()
        expect(s.location).toBeNull()
      })

      it('does not override a place picked while the IP lookup was running', async () => {
        fail(1)
        let resolveIp!: (l: Location) => void
        vi.mocked(ipLocationService.locate).mockReturnValue(new Promise((r) => (resolveIp = r)))
        const s = useLocationStore()
        const pending = s.detectLocation()
        await vi.waitFor(() => expect(ipLocationService.locate).toHaveBeenCalled())
        s.select({ name: 'Manual', latitude: 1, longitude: 2 })
        resolveIp(byIp)
        await pending
        expect(s.location?.name).toBe('Manual')
      })
    })
  })
})
