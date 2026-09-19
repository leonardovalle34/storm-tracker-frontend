import { describe, expect, it } from 'vitest'
import { HOURS, buildMarineDays, buildWindDays, hasWaveData } from './hourly'

const times = (days: string[]) =>
  days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`))

describe('hourly utils', () => {
  it('uses 3h steps from 3h to 21h', () => {
    expect(HOURS).toEqual([3, 6, 9, 12, 15, 18, 21])
  })

  it('builds one block per day with 7 wind columns, speed taken as-is (API already in knots)', () => {
    const time = times(['2026-09-19', '2026-09-20'])
    const days = buildWindDays({
      time,
      wind_speed_10m: time.map((_, i) => 10 + i), // knots
      wind_direction_10m: time.map((_, i) => i),
    })
    expect(days.map((d) => d.date)).toEqual(['2026-09-19', '2026-09-20'])
    expect(days[0].columns.map((c) => c.hour)).toEqual(HOURS)
    expect(days[0].columns[0].knots).toBe(13)
    expect(days[0].columns[0].direction).toBe(3)
    expect(days[1].columns[6].direction).toBe(24 + 21)
    expect(days[0].columns[0].level).toBe('moderate')
  })

  it('skips incomplete/absent hours and null values gracefully', () => {
    const days = buildWindDays({
      time: ['2026-09-19T00:00', '2026-09-19T06:00'],
      wind_speed_10m: [5, 60],
      wind_direction_10m: [0, 90],
    })
    expect(days[0].columns.map((c) => c.hour)).toEqual([6])
    expect(days[0].columns[0].level).toBe('extreme')
  })

  it('builds marine days keeping nulls', () => {
    const time = times(['2026-09-19'])
    const days = buildMarineDays({
      time,
      wave_height: time.map(() => 1),
      swell_wave_height: time.map((_, i) => (i === 3 ? null : 1.5)),
      sea_level_height_msl: time.map(() => 0.2),
      sea_surface_temperature: time.map(() => 22),
    })
    expect(days[0].columns[0]).toMatchObject({ hour: 3, swell: null, tide: 0.2, waterTemp: 22 })
    expect(days[0].columns[1].swell).toBe(1.5)
  })

  it('hasWaveData is decided only by wave_height being non-null', () => {
    expect(hasWaveData(undefined)).toBe(false)
    expect(
      hasWaveData({
        time: ['a'],
        wave_height: [null],
        swell_wave_height: [1],
        sea_level_height_msl: [1],
        sea_surface_temperature: [1],
      }),
    ).toBe(false)
    expect(
      hasWaveData({
        time: ['a', 'b'],
        wave_height: [null, 0.4],
        swell_wave_height: [],
        sea_level_height_msl: [],
        sea_surface_temperature: [],
      }),
    ).toBe(true)
  })
})
