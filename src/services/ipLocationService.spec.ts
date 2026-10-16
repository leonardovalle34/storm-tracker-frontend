import { afterEach, describe, expect, it, vi } from 'vitest'
import { locate } from './ipLocationService'

const reply = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => body }))

describe('ipLocationService', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('maps the response (coordinates come as strings)', async () => {
    reply({ latitude: '-26.3033', longitude: '-48.8413', city: 'Joinville', country: 'Brazil' })
    expect(await locate()).toEqual({ name: 'Joinville, Brazil', latitude: -26.3033, longitude: -48.8413 })
  })

  it('returns null on HTTP errors, missing coordinates and network failures', async () => {
    reply({}, false)
    expect(await locate()).toBeNull()
    reply({ city: 'X' })
    expect(await locate()).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await locate()).toBeNull()
  })
})
