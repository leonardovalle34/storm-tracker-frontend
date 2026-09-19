import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { search } from './geocodeService'

const fetchMock = vi.fn()
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('geocodeService', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('normalizes Nominatim results (string lat/lon)', async () => {
    fetchMock.mockReturnValue(ok([{ display_name: 'Santos, SP, Brasil', lat: '-23.96', lon: '-46.33' }]))
    const res = await search('santos')
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/weather\/geocode\?name=santos$/)
    expect(res).toEqual([{ name: 'Santos, SP, Brasil', latitude: -23.96, longitude: -46.33 }])
  })

  it('also accepts the {results: Location[]} shape', async () => {
    fetchMock.mockReturnValue(
      ok({ results: [{ name: 'Rio', latitude: -22.9, longitude: -43.2, country: 'BR' }] }),
    )
    expect(await search('rio')).toEqual([{ name: 'Rio, BR', latitude: -22.9, longitude: -43.2 }])
  })

  it('encodes the query', async () => {
    fetchMock.mockReturnValue(ok([]))
    await search('são paulo')
    expect(String(fetchMock.mock.calls[0][0])).toContain('name=s%C3%A3o+paulo')
  })
})
