import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetSelectedLocation, useSelectedLocation } from './useSelectedLocation'
import { requestInitialLocation } from './useGeolocation'

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

describe('requestInitialLocation', () => {
  beforeEach(() => {
    _resetSelectedLocation()
    getCurrentPosition.mockReset()
    stubGeo()
  })

  it('selects the user location when the permission is granted', async () => {
    grant()
    await requestInitialLocation()
    expect(useSelectedLocation().location.value).toMatchObject({ latitude: -23.5, longitude: -46.6 })
  })

  it('stays empty and silent when denied', async () => {
    deny()
    await expect(requestInitialLocation()).resolves.toBeUndefined()
    expect(useSelectedLocation().location.value).toBeNull()
  })

  it('does nothing when the browser has no geolocation', async () => {
    stubGeo(false)
    await requestInitialLocation()
    expect(getCurrentPosition).not.toHaveBeenCalled()
    expect(useSelectedLocation().location.value).toBeNull()
  })

  it('asks only once (no repeated prompts after a denial)', async () => {
    deny()
    await requestInitialLocation()
    await requestInitialLocation()
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('on later visits, reuses a permission that is already granted (no prompt involved)', async () => {
    deny()
    await requestInitialLocation() // first visit consumed the "ask once"
    stubGeo(true, 'granted')
    grant()
    await requestInitialLocation()
    expect(useSelectedLocation().location.value).toMatchObject({ latitude: -23.5 })
  })

  it('on later visits, does not ask when permission is not granted', async () => {
    deny()
    await requestInitialLocation()
    getCurrentPosition.mockClear()
    stubGeo(true, 'prompt')
    await requestInitialLocation()
    stubGeo(true, 'denied')
    await requestInitialLocation()
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('never overrides a location the user picked while the prompt was open', async () => {
    let answer!: Ok
    getCurrentPosition.mockImplementation((ok: Ok) => (answer = ok))
    const pending = requestInitialLocation()
    useSelectedLocation().select({ name: 'Manual', latitude: 1, longitude: 2 })
    answer({ coords: { latitude: -23.5, longitude: -46.6 } })
    await pending
    expect(useSelectedLocation().location.value?.name).toBe('Manual')
  })
})
