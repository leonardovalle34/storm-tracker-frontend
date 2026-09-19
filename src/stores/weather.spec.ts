import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as weatherService from '@/services/weatherService'
import { ApiError } from '@/services/http'
import { useLocationStore } from './location'
import { useWeatherStore } from './weather'

vi.mock('@/services/weatherService')
const forecast = vi.mocked(weatherService.getForecast)
const marine = vi.mocked(weatherService.getMarine)
const moon = vi.mocked(weatherService.getMoonPhase)

const fc = { daily: { time: ['2026-09-19'] }, hourly: { time: [] } } as never
const coastal = { hourly: { time: ['t'], wave_height: [1] } } as never
const inland = { hourly: { time: ['t'], wave_height: [null] } } as never

describe('weather store', () => {
  beforeEach(() => {
    forecast.mockReset()
    marine.mockReset()
    moon.mockReset()
  })

  it('does nothing without a location', async () => {
    const w = useWeatherStore()
    await w.load()
    expect(forecast).not.toHaveBeenCalled()
    expect(w.isCoastal).toBe(false)
  })

  it('loads forecast and marine for the selected location', async () => {
    forecast.mockResolvedValue(fc)
    marine.mockResolvedValue(coastal)
    useLocationStore().selectCoords(-23.9, -46.3)
    const w = useWeatherStore()
    const p = w.load()
    expect(w.loading).toBe(true)
    await p
    expect(forecast).toHaveBeenCalledWith(-23.9, -46.3)
    expect(marine).toHaveBeenCalledWith(-23.9, -46.3)
    expect(w.forecast).toEqual(fc)
    expect(w.isCoastal).toBe(true)
    expect(w.loading).toBe(false)
  })

  it('is not coastal when wave_height is null', async () => {
    forecast.mockResolvedValue(fc)
    marine.mockResolvedValue(inland)
    useLocationStore().selectCoords(-15, -47)
    const w = useWeatherStore()
    await w.load()
    expect(w.isCoastal).toBe(false)
  })

  it('a marine failure does not break the forecast and hides ocean content', async () => {
    forecast.mockResolvedValue(fc)
    marine.mockRejectedValue(new Error('boom'))
    useLocationStore().selectCoords(1, 1)
    const w = useWeatherStore()
    await w.load()
    expect(w.forecast).toEqual(fc)
    expect(w.error).toBeNull()
    expect(w.isCoastal).toBe(false)
  })

  it('drops a trailing day the model has no data for', async () => {
    forecast.mockResolvedValue({
      daily: { time: ['2026-09-19', '2026-09-20'], temperature_2m_max: [25, null] },
      hourly: { time: ['2026-09-19T00:00', '2026-09-20T00:00'] },
    } as never)
    marine.mockResolvedValue(coastal)
    useLocationStore().selectCoords(1, 1)
    const w = useWeatherStore()
    await w.load()
    expect(w.forecast?.daily.time).toEqual(['2026-09-19'])
    expect(w.forecast?.hourly.time).toEqual(['2026-09-19T00:00'])
  })

  it('reports an error when the forecast fails', async () => {
    forecast.mockRejectedValue(new Error('boom'))
    marine.mockResolvedValue(inland)
    useLocationStore().selectCoords(1, 1)
    const w = useWeatherStore()
    await w.load()
    expect(w.error).toBe('boom')
    expect(w.forecast).toBeNull()
    expect(w.loading).toBe(false)
  })

  it('resets the error when a new load starts and does not re-throw', async () => {
    forecast.mockRejectedValueOnce(new Error('boom'))
    forecast.mockResolvedValueOnce(fc)
    marine.mockResolvedValue(inland)
    useLocationStore().selectCoords(1, 1)
    const w = useWeatherStore()
    await expect(w.load()).resolves.toBeUndefined()
    expect(w.error).toBe('boom')
    const p = w.load()
    expect(w.error).toBeNull()
    await p
    expect(w.forecast).toEqual(fc)
  })

  it('drops stale responses when the location changes quickly', async () => {
    let resolveA!: (v: never) => void
    forecast.mockImplementationOnce(() => new Promise((r) => (resolveA = r)))
    forecast.mockResolvedValueOnce(fc)
    marine.mockResolvedValue(coastal)
    const loc = useLocationStore()
    const w = useWeatherStore()
    loc.selectCoords(1, 1)
    const first = w.load()
    loc.selectCoords(2, 2)
    await w.load()
    resolveA({ daily: { time: ['OLD'] } } as never)
    await first
    expect(w.forecast).toEqual(fc)
  })

  describe('moon phase', () => {
    const phase = { date: '2026-09-19', phase_index: 1, phase_name: 'New Moon' }

    it('is cached per date, and concurrent requests share one call', async () => {
      moon.mockResolvedValue(phase)
      const w = useWeatherStore()
      await Promise.all([w.loadMoonPhase('2026-09-19'), w.loadMoonPhase('2026-09-19')])
      await w.loadMoonPhase('2026-09-19')
      expect(moon).toHaveBeenCalledTimes(1)
      expect(w.moonPhases['2026-09-19']).toEqual(phase)
    })

    it('keeps the backend detail of a 400', async () => {
      moon.mockRejectedValue(new ApiError(400, 'Invalid date format'))
      const w = useWeatherStore()
      await w.loadMoonPhase('nope')
      expect(w.moonErrors.nope).toBe('Invalid date format')
      expect(w.moonPhases.nope).toBeUndefined()
    })

    it('other failures stay silent and are not cached', async () => {
      moon.mockRejectedValueOnce(new ApiError(429))
      const w = useWeatherStore()
      await w.loadMoonPhase('2026-09-20')
      expect(w.moonErrors['2026-09-20']).toBeUndefined()
      moon.mockResolvedValueOnce({ ...phase, date: '2026-09-20' })
      await w.loadMoonPhase('2026-09-20')
      expect(w.moonPhases['2026-09-20']).toBeDefined()
    })
  })
})
