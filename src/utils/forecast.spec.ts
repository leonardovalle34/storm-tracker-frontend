import { describe, expect, it } from 'vitest'
import type { ForecastResponse } from '@/types/weather'
import { trimEmptyTrailingDays } from './forecast'

const hours = (d: string) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`)

function make(maxes: (number | null)[]): ForecastResponse {
  const dates = maxes.map((_, i) => `2026-09-${String(19 + i).padStart(2, '0')}`)
  const time = dates.flatMap(hours)
  return {
    daily: {
      time: dates,
      temperature_2m_max: maxes as number[],
      temperature_2m_min: maxes.map((m) => (m === null ? null : m - 8)) as number[],
      precipitation_sum: maxes.map((m) => (m === null ? null : 1)) as number[],
      weather_code: maxes.map((m) => (m === null ? null : 3)) as number[],
      uv_index_max: maxes.map((m) => (m === null ? null : 5)) as number[],
      sunrise: dates.map((d) => `${d}T05:50`),
      sunset: dates.map((d) => `${d}T18:10`),
    },
    hourly: {
      time,
      wind_speed_10m: time.map(() => 10),
      wind_direction_10m: time.map(() => 90),
      precipitation: time.map(() => 0),
    },
  }
}

describe('trimEmptyTrailingDays', () => {
  it('removes the last day when the model has no data for it (null temperatures)', () => {
    const r = trimEmptyTrailingDays(make([25, 26, null]))
    expect(r.daily.time).toEqual(['2026-09-19', '2026-09-20'])
    for (const k of Object.keys(r.daily) as (keyof typeof r.daily)[]) expect(r.daily[k]).toHaveLength(2)
  })

  it('removes that day from the hourly series too, keeping all arrays aligned', () => {
    const r = trimEmptyTrailingDays(make([25, 26, null]))
    expect(r.hourly.time).toHaveLength(48)
    expect(r.hourly.time.at(-1)).toBe('2026-09-20T23:00')
    expect(r.hourly.wind_speed_10m).toHaveLength(48)
    expect(r.hourly.wind_direction_10m).toHaveLength(48)
    expect(r.hourly.precipitation).toHaveLength(48)
  })

  it('keeps every day when the last one has real data', () => {
    const f = make([25, 26, 27])
    expect(trimEmptyTrailingDays(f)).toEqual(f)
  })

  it('only trims trailing empty days, never a gap in the middle', () => {
    expect(trimEmptyTrailingDays(make([25, null, 27])).daily.time).toHaveLength(3)
    expect(trimEmptyTrailingDays(make([25, null, null])).daily.time).toEqual(['2026-09-19'])
  })

  it('does not mutate its input and tolerates missing arrays', () => {
    const f = make([25, null])
    trimEmptyTrailingDays(f)
    expect(f.daily.time).toHaveLength(2)
    const partial = { daily: { time: ['2026-09-19'] }, hourly: { time: [] } } as unknown as ForecastResponse
    expect(trimEmptyTrailingDays(partial)).toEqual(partial)
  })
})
