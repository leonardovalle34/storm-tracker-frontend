import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './http'
import { getForecast, getMarine, getMoonPhase } from './weatherService'

const fetchMock = vi.fn()

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
const fail = (status: number, body: unknown = {}) =>
  Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) })

describe('weatherService', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('forecast and marine send lat/lon', async () => {
    fetchMock.mockReturnValue(ok({ daily: {}, hourly: {} }))
    await getForecast(-23.5, -46.6)
    await getMarine(-23.5, -46.6)
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/weather\/forecast\?lat=-23.5&lon=-46.6$/)
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/weather\/marine\?lat=-23.5&lon=-46.6$/)
  })

  it('moon phase sends the target date and does not cache (that is the store’s job)', async () => {
    fetchMock.mockReturnValue(ok({ date: '2026-09-19', phase_index: 1, phase_name: 'New Moon' }))
    await getMoonPhase('2026-09-19')
    await getMoonPhase('2026-09-19')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/weather\/moon-phase\?target_date=2026-09-19$/)
  })

  it('throws on non-ok responses', async () => {
    fetchMock.mockReturnValue(fail(502))
    await expect(getForecast(0, 0)).rejects.toThrow(/502/)
  })

  it('exposes status and FastAPI detail on errors (e.g. moon-phase 400)', async () => {
    fetchMock.mockReturnValue(fail(400, { detail: 'Invalid date format' }))
    const err = await getMoonPhase('nope').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 400, detail: 'Invalid date format' })
  })
})
