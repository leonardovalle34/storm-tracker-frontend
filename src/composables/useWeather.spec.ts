import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import * as api from '@/services/api'
import { _resetSelectedLocation, useSelectedLocation } from './useSelectedLocation'
import { useWeather } from './useWeather'

vi.mock('@/services/api')
const forecast = vi.mocked(api.fetchForecast)
const marine = vi.mocked(api.fetchMarine)

const fc = { daily: { time: ['2026-09-19'] }, hourly: { time: [] } } as never
const coastal = { hourly: { time: ['t'], wave_height: [1] } } as never
const inland = { hourly: { time: ['t'], wave_height: [null] } } as never

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
  await Promise.resolve()
}

const scopes: ReturnType<typeof effectScope>[] = []
function setup() {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useWeather())!
}
afterEach(() => scopes.splice(0).forEach((s) => s.stop()))

describe('useWeather', () => {
  beforeEach(() => {
    _resetSelectedLocation()
    forecast.mockReset()
    marine.mockReset()
  })

  it('does nothing without a location', async () => {
    const w = setup()
    await settle()
    expect(forecast).not.toHaveBeenCalled()
    expect(w.isCoastal.value).toBe(false)
  })

  it('loads forecast and marine when the shared location changes', async () => {
    forecast.mockResolvedValue(fc)
    marine.mockResolvedValue(coastal)
    const w = setup()
    useSelectedLocation().selectCoords(-23.9, -46.3)
    await settle()
    expect(forecast).toHaveBeenCalledWith(-23.9, -46.3)
    expect(marine).toHaveBeenCalledWith(-23.9, -46.3)
    expect(w.forecast.value).toEqual(fc)
    expect(w.isCoastal.value).toBe(true)
    expect(w.loading.value).toBe(false)
  })

  it('is not coastal when wave_height is null', async () => {
    forecast.mockResolvedValue(fc)
    marine.mockResolvedValue(inland)
    const w = setup()
    useSelectedLocation().selectCoords(-15, -47)
    await settle()
    expect(w.isCoastal.value).toBe(false)
  })

  it('a marine failure does not break the forecast and hides ocean content', async () => {
    forecast.mockResolvedValue(fc)
    marine.mockRejectedValue(new Error('boom'))
    const w = setup()
    useSelectedLocation().selectCoords(1, 1)
    await settle()
    expect(w.forecast.value).toEqual(fc)
    expect(w.error.value).toBeNull()
    expect(w.isCoastal.value).toBe(false)
  })

  it('reports an error when the forecast fails', async () => {
    forecast.mockRejectedValue(new Error('boom'))
    marine.mockResolvedValue(inland)
    const w = setup()
    useSelectedLocation().selectCoords(1, 1)
    await settle()
    expect(w.error.value).toBeTruthy()
    expect(w.forecast.value).toBeNull()
  })

  it('drops stale responses when the location changes quickly', async () => {
    let resolveA!: (v: never) => void
    forecast.mockImplementationOnce(() => new Promise((r) => (resolveA = r)))
    forecast.mockResolvedValueOnce(fc)
    marine.mockResolvedValue(coastal)
    const w = setup()
    const { selectCoords } = useSelectedLocation()
    selectCoords(1, 1)
    await nextTick()
    selectCoords(2, 2)
    await settle()
    resolveA({ daily: { time: ['OLD'] } } as never)
    await settle()
    expect(w.forecast.value).toEqual(fc)
  })
})
