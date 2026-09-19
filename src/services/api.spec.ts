import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchForecast, fetchMarine, fetchMoonPhase, geocode, _clearMoonCache } from './api'

const fetchMock = vi.fn()

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
}

describe('api service', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    _clearMoonCache()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('geocode normalizes Nominatim results (string lat/lon)', async () => {
    fetchMock.mockReturnValue(ok([{ display_name: 'Santos, SP, Brasil', lat: '-23.96', lon: '-46.33' }]))
    const res = await geocode('santos')
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/weather\/geocode\?name=santos$/)
    expect(res).toEqual([{ name: 'Santos, SP, Brasil', latitude: -23.96, longitude: -46.33 }])
  })

  it('geocode also accepts the {results: Location[]} shape', async () => {
    fetchMock.mockReturnValue(ok({ results: [{ name: 'Rio', latitude: -22.9, longitude: -43.2, country: 'BR' }] }))
    expect(await geocode('rio')).toEqual([{ name: 'Rio, BR', latitude: -22.9, longitude: -43.2 }])
  })

  it('geocode encodes the query', async () => {
    fetchMock.mockReturnValue(ok([]))
    await geocode('são paulo')
    expect(String(fetchMock.mock.calls[0][0])).toContain('name=s%C3%A3o+paulo')
  })

  it('forecast and marine send lat/lon', async () => {
    fetchMock.mockReturnValue(ok({ daily: {}, hourly: {} }))
    await fetchForecast(-23.5, -46.6)
    await fetchMarine(-23.5, -46.6)
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/weather\/forecast\?lat=-23.5&lon=-46.6$/)
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/weather\/marine\?lat=-23.5&lon=-46.6$/)
  })

  it('moon phase is cached per date', async () => {
    fetchMock.mockReturnValue(ok({ date: '2026-09-19', phase_index: 1, phase_name: 'New Moon' }))
    await fetchMoonPhase('2026-09-19')
    await fetchMoonPhase('2026-09-19')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/weather\/moon-phase\?target_date=2026-09-19$/)
  })

  it('throws on non-ok responses', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({}) }))
    await expect(fetchForecast(0, 0)).rejects.toThrow(/502/)
  })

  it('failed moon lookups are not cached', async () => {
    fetchMock.mockReturnValueOnce(Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) }))
    await expect(fetchMoonPhase('2026-09-20')).rejects.toThrow()
    fetchMock.mockReturnValueOnce(ok({ date: '2026-09-20', phase_index: 2, phase_name: 'New Moon' }))
    await expect(fetchMoonPhase('2026-09-20')).resolves.toBeTruthy()
  })
})
