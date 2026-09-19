import { describe, expect, it } from 'vitest'
import type { ForecastResponse, MarineResponse } from '@/types/weather'
import { bestWindow, daylightHours, planDays, formatWindow } from './activityPlanner'

const DATE = '2026-09-19'
const hh = (h: number) => `${DATE}T${String(h).padStart(2, '0')}:00`
const HOURS24 = Array.from({ length: 24 }, (_, h) => h)

describe('daylightHours', () => {
  it('uses whole hours between sunrise and sunset', () => {
    expect(daylightHours('2026-09-19T05:50', '2026-09-19T18:10')).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ])
  })
  it('falls back to 6h-17h without sun times', () => {
    expect(daylightHours()).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
  })
})

describe('bestWindow', () => {
  it('finds the contiguous run around the best hour within 10 points of it', () => {
    const scores = new Map([
      [8, 40],
      [9, 70],
      [10, 92],
      [11, 88],
      [12, 83],
      [13, 60],
      [14, 95],
      [15, 30],
    ])
    // peak is 14h (95): only 14h itself is within 10 points and contiguous (13h=60 is not)
    expect(bestWindow(scores)).toMatchObject({ start: 14, end: 14, score: 95 })
    scores.set(14, 90) // now 10h (92) is the peak: 11h and 12h (83 >= 82) join, 13h does not
    expect(bestWindow(scores)).toMatchObject({ start: 10, end: 12 })
    expect(bestWindow(scores)!.score).toBe(Math.round((92 + 88 + 83) / 3))
  })

  it('does not bridge hours that have no data', () => {
    const scores = new Map([
      [9, 90],
      [11, 90],
    ])
    expect(bestWindow(scores)).toMatchObject({ start: 9, end: 9 })
  })

  it('returns null with no scored hours', () => {
    expect(bestWindow(new Map())).toBeNull()
  })
})

describe('formatWindow', () => {
  it('shows start to end-of-last-hour', () => {
    expect(formatWindow({ start: 10, end: 12 })).toBe('10h–13h')
    expect(formatWindow({ start: 14, end: 14 })).toBe('14h–15h')
  })
})

function scenario(
  opts: { wind?: (h: number) => number; code?: number; hourlyCodes?: (h: number) => number } = {},
) {
  const wind = opts.wind ?? (() => 20)
  const forecast = {
    daily: {
      time: [DATE],
      weather_code: [opts.code ?? 0],
      sunrise: [`${DATE}T05:50`],
      sunset: [`${DATE}T18:10`],
    },
    hourly: {
      time: HOURS24.map(hh),
      wind_speed_10m: HOURS24.map(wind),
      wind_direction_10m: HOURS24.map(() => 0),
      ...(opts.hourlyCodes ? { weather_code: HOURS24.map(opts.hourlyCodes) } : {}),
    },
  } as unknown as ForecastResponse
  const marine = {
    hourly: {
      time: HOURS24.map(hh),
      wave_height: HOURS24.map(() => 1),
      swell_wave_height: HOURS24.map(() => 1),
      swell_wave_period: HOURS24.map(() => 12),
      swell_wave_direction: HOURS24.map(() => 180),
      sea_level_height_msl: HOURS24.map(() => 0),
      sea_surface_temperature: HOURS24.map(() => 22),
    },
  } as unknown as MarineResponse
  return { forecast, marine }
}

describe('planDays', () => {
  it('produces the four activities per day, in order', () => {
    const { forecast, marine } = scenario()
    const day = planDays(forecast, marine).get(DATE)!
    expect(day.map((r) => r.activity)).toEqual(['surf', 'kite', 'swimming', 'diving'])
  })

  it('kite peaks in the hours where the wind is ideal', () => {
    // wind 8 kt except 13h-15h at 20 kt
    const { forecast, marine } = scenario({ wind: (h) => (h >= 13 && h <= 15 ? 20 : 8) })
    const kite = planDays(forecast, marine)
      .get(DATE)!
      .find((r) => r.activity === 'kite')!
    expect(kite).toMatchObject({ start: 13, end: 15, label: 'great' })
  })

  it('only daylight hours are considered', () => {
    const { forecast, marine } = scenario({ wind: (h) => (h === 2 ? 20 : 5) })
    const kite = planDays(forecast, marine)
      .get(DATE)!
      .find((r) => r.activity === 'kite')!
    expect(kite.start).toBeGreaterThanOrEqual(6)
  })

  it('a thunderstorm day (daily code >= 95) is "stormy" for every activity, score 0', () => {
    const { forecast, marine } = scenario({ code: 95 })
    const day = planDays(forecast, marine).get(DATE)!
    expect(day.every((r) => r.label === 'stormy' && r.score === 0)).toBe(true)
  })

  it('hourly weather_code, when the API provides it, wins over the daily code', () => {
    const { forecast, marine } = scenario({ code: 95, hourlyCodes: (h) => (h < 12 ? 96 : 0) })
    const swim = planDays(forecast, marine)
      .get(DATE)!
      .find((r) => r.activity === 'swimming')!
    expect(swim.label).not.toBe('stormy')
    expect(swim.start).toBeGreaterThanOrEqual(12)
  })

  it('shows no window (null label) for activities lacking data, and skips days without marine data', () => {
    const { forecast, marine } = scenario()
    marine.hourly.wave_height = marine.hourly.wave_height.map(() => null)
    const day = planDays(forecast, marine).get(DATE)!
    expect(day.find((r) => r.activity === 'swimming')).toMatchObject({ label: null, score: null })
    expect(day.find((r) => r.activity === 'kite')!.label).not.toBeNull()
    marine.hourly.time = marine.hourly.time.map((t) => t.replace(DATE, '2026-10-01'))
    expect(planDays(forecast, marine).get(DATE)).toBeUndefined()
  })
})
