import { describe, expect, it } from 'vitest'
import type { ForecastResponse, MarineResponse } from '@/types/weather'
import { clarityByDay, clarityLabel, estimateWaterClarity } from './waterClarity'

// Rule-based ESTIMATE (no API measures underwater visibility): waves, wind and recent rain stir/muddy the water.
const calm = { waveHeight: 0.3, windKt: 5, swellPeriod: 10, rain24h: 0 }

describe('estimateWaterClarity', () => {
  it('ideal: flat, calm, dry = 100', () => {
    expect(estimateWaterClarity(calm)).toBe(100)
  })

  it('bad: rough sea, strong wind, short period and rain', () => {
    expect(estimateWaterClarity({ waveHeight: 2, windKt: 20, swellPeriod: 4, rain24h: 5 })).toBe(0)
  })

  it('waves above 0.3 m cloud the water (35 points per meter)', () => {
    expect(estimateWaterClarity({ ...calm, waveHeight: 1.3 })).toBe(65)
    expect(estimateWaterClarity({ ...calm, waveHeight: 0.2 })).toBe(100)
  })

  it('wind above 8 kt clouds it (2.5 points per knot)', () => {
    expect(estimateWaterClarity({ ...calm, windKt: 8 })).toBe(100)
    expect(estimateWaterClarity({ ...calm, windKt: 16 })).toBe(80)
  })

  it('recent rain washes sediment in (2 points per mm, capped at 40)', () => {
    expect(estimateWaterClarity({ ...calm, rain24h: 10 })).toBe(80)
    expect(estimateWaterClarity({ ...calm, rain24h: 200 })).toBe(60)
  })

  it('a short swell period (< 6 s, choppy) costs 10 points', () => {
    expect(estimateWaterClarity({ ...calm, swellPeriod: 5 })).toBe(90)
    expect(estimateWaterClarity({ ...calm, swellPeriod: null })).toBe(100)
  })

  it('is null without wave height or wind, and stays within 0-100', () => {
    expect(estimateWaterClarity({ ...calm, waveHeight: null })).toBeNull()
    expect(estimateWaterClarity({ ...calm, windKt: null })).toBeNull()
    expect(estimateWaterClarity({ ...calm, rain24h: null })).toBe(100)
    expect(estimateWaterClarity({ waveHeight: 9, windKt: 60, swellPeriod: 2, rain24h: 999 })).toBe(0)
  })
})

describe('clarityLabel', () => {
  it.each([
    [100, 'excellent'],
    [80, 'excellent'],
    [79, 'good'],
    [60, 'good'],
    [59, 'moderate'],
    [40, 'moderate'],
    [39, 'poor'],
    [0, 'poor'],
  ])('%s is %s', (s, l) => {
    expect(clarityLabel(s)).toBe(l)
  })
})

describe('clarityByDay', () => {
  const dates = ['2026-09-19', '2026-09-20']
  const times = dates.flatMap((d) =>
    Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`),
  )
  const make = (rain: (i: number) => number, wave = 0.3, wind = 5) => {
    const forecast = {
      daily: { time: dates },
      hourly: {
        time: times,
        wind_speed_10m: times.map(() => wind),
        wind_direction_10m: times.map(() => 0),
        precipitation: times.map((_, i) => rain(i)),
      },
    } as unknown as ForecastResponse
    const marine = {
      hourly: { time: times, wave_height: times.map(() => wave), swell_wave_period: times.map(() => 10) },
    } as unknown as MarineResponse
    return { forecast, marine }
  }

  it('a calm dry day is excellent', () => {
    const { forecast, marine } = make(() => 0)
    expect(clarityByDay(forecast, marine).get('2026-09-19')).toEqual({ score: 100, label: 'excellent' })
  })

  it('rain in the previous 24 h lowers the next day (runoff), not before it falls', () => {
    const { forecast, marine } = make((i) => (i >= 24 && i < 30 ? 5 : 0)) // 30 mm on day 2 morning
    const r = clarityByDay(forecast, marine)
    expect(r.get('2026-09-19')!.score).toBe(100)
    expect(r.get('2026-09-20')!.score).toBeLessThan(80)
  })

  it('rougher seas give a lower label', () => {
    const { forecast, marine } = make(() => 0, 2, 20)
    expect(clarityByDay(forecast, marine).get('2026-09-19')!.label).toBe('poor')
  })

  it('omits days without marine data', () => {
    const { forecast, marine } = make(() => 0)
    marine.hourly.wave_height = marine.hourly.wave_height.map(() => null)
    expect(clarityByDay(forecast, marine).size).toBe(0)
  })
})
