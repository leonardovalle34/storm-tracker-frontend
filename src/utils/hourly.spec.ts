import { describe, expect, it } from 'vitest'
import { HOURS, buildMarineDays, buildWindDays, firstGapIndex, hasWaveData } from './hourly'

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
    // increasing series: each column is the peak of its window, i.e. the hour after the column hour
    expect(days[0].columns[0].knots).toBe(14)
    expect(days[0].columns[0].direction).toBe(4)
    expect(days[1].columns[6].direction).toBe(24 + 22)
    expect(days[0].columns[0].level).toBe('moderate')
  })

  it('carries the gust per column, classified with the same windLevel scale as the sustained wind', () => {
    const time = times(['2026-09-19'])
    const [day] = buildWindDays({
      time,
      wind_speed_10m: time.map(() => 5),
      wind_direction_10m: time.map(() => 0),
      wind_gusts_10m: time.map((_, i) => (i === 3 ? 25 : null)),
    })
    expect(day.columns[0]).toMatchObject({ level: 'calm', gustKnots: 25, gustLevel: 'strong' })
    expect(day.columns[1]).toMatchObject({ gustKnots: null, gustLevel: null })
  })

  it('gust is null when the API omits wind_gusts_10m', () => {
    const [day] = buildWindDays({ time: ['2026-09-19T03:00'], wind_speed_10m: [5], wind_direction_10m: [0] })
    expect(day.columns[0]).toMatchObject({ gustKnots: null, gustLevel: null })
  })

  it('each wind column is the max of its 3h window (hour-1..hour+1); direction follows the peak instant', () => {
    const time = times(['2026-09-19'])
    const speed = time.map(() => 5)
    speed[16] = 25 // a spike at 16h, between the 15h and 18h columns
    const dir = time.map((_, i) => i * 10)
    const gust = time.map(() => 8)
    gust[14] = 33
    const [day] = buildWindDays({
      time,
      wind_speed_10m: speed,
      wind_direction_10m: dir,
      wind_gusts_10m: gust,
    })
    const col = (h: number) => day.columns.find((c) => c.hour === h)!
    expect(col(15)).toMatchObject({
      knots: 25,
      direction: 160,
      level: 'strong',
      gustKnots: 33,
      gustLevel: 'extreme',
    })
    expect(col(18)).toMatchObject({ knots: 5, direction: 170, gustKnots: 8 }) // 17h-19h: spike not repeated; tie keeps the earliest hour
    expect(col(12)).toMatchObject({ knots: 5, gustKnots: 8 })
  })

  it('a peak exactly on the column hour still wins, and null gusts in the window are ignored', () => {
    const time = times(['2026-09-19'])
    const speed = time.map(() => 5)
    speed[9] = 12
    speed[8] = 20
    const [day] = buildWindDays({
      time,
      wind_speed_10m: speed,
      wind_direction_10m: time.map((_, i) => i),
      wind_gusts_10m: time.map((_, i) => (i === 10 ? 14 : null)),
    })
    expect(day.columns[2]).toMatchObject({ hour: 9, knots: 20, direction: 8, gustKnots: 14 })
    expect(day.columns[0].gustKnots).toBeNull()
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
      swell_wave_height: time.map((_, i) => (i >= 2 && i <= 4 ? null : 1.5)), // whole 3h window empty
      swell_wave_period: time.map(() => 11),
      swell_wave_direction: time.map(() => 180),
      sea_level_height_msl: time.map(() => 0.2),
      sea_surface_temperature: time.map(() => 22),
    })
    expect(days[0].columns[0]).toMatchObject({
      hour: 3,
      swell: null,
      period: 11,
      swellDir: 180,
      tide: 0.2,
      waterTemp: 22,
    })
    expect(days[0].columns[1].swell).toBe(1.5)
  })

  it('a null inside the window is ignored, not treated as zero', () => {
    const time = times(['2026-09-19'])
    const [day] = buildMarineDays({
      time,
      wave_height: time.map(() => 1),
      swell_wave_height: time.map((_, i) => (i === 3 ? null : i === 4 ? 0.8 : 0.5)),
      swell_wave_period: time.map(() => 11),
      swell_wave_direction: time.map((_, i) => i),
      sea_level_height_msl: time.map(() => 0.2),
      sea_surface_temperature: time.map(() => 22),
    })
    expect(day.columns[0]).toMatchObject({ swell: 0.8, swellDir: 4 })
  })

  it('each swell column is the max of its 3h window; period and direction follow the peak instant', () => {
    const time = times(['2026-09-19'])
    const swell = time.map(() => 1)
    swell[16] = 2.4 // between the 15h and 18h columns
    const [day] = buildMarineDays({
      time,
      wave_height: time.map(() => 1),
      swell_wave_height: swell,
      swell_wave_period: time.map((_, i) => i),
      swell_wave_direction: time.map((_, i) => i * 10),
      sea_level_height_msl: time.map((_, i) => i / 10),
      sea_surface_temperature: time.map(() => 22),
    })
    const col = (h: number) => day.columns.find((c) => c.hour === h)!
    expect(col(15)).toMatchObject({ swell: 2.4, period: 16, swellDir: 160, tide: 1.5 }) // tide stays at 15h
    expect(col(18)).toMatchObject({ swell: 1, period: 17, swellDir: 170 })
  })

  it('hasWaveData is decided only by wave_height being non-null', () => {
    expect(hasWaveData(undefined)).toBe(false)
    expect(
      hasWaveData({
        time: ['a'],
        wave_height: [null],
        swell_wave_height: [1],
        swell_wave_period: [],
        swell_wave_direction: [],
        sea_level_height_msl: [1],
        sea_surface_temperature: [1],
      }),
    ).toBe(false)
    expect(
      hasWaveData({
        time: ['a', 'b'],
        wave_height: [null, 0.4],
        swell_wave_height: [],
        swell_wave_period: [],
        swell_wave_direction: [],
        sea_level_height_msl: [],
        sea_surface_temperature: [],
      }),
    ).toBe(true)
  })

  describe('marine data gaps', () => {
    const mk = (nDays: number, nullFrom?: number) => {
      const dates = Array.from({ length: nDays }, (_, i) => `2026-09-${String(19 + i).padStart(2, '0')}`)
      const time = times(dates)
      const val = (v: number) => time.map((_, i) => (nullFrom !== undefined && i >= nullFrom ? null : v))
      return {
        time,
        wave_height: val(1),
        swell_wave_height: val(1.5),
        swell_wave_period: val(10),
        swell_wave_direction: val(180),
        sea_level_height_msl: val(0.3),
        sea_surface_temperature: val(22),
      }
    }

    it('never drops a day: all days in the response are returned, including all-null ones', () => {
      const days = buildMarineDays(mk(16, 24 * 8 + 21)) // like the real API: last value at day 9, 20h
      expect(days).toHaveLength(16)
      expect(days.every((d) => d.columns.length === 7)).toBe(true)
    })

    it('flags hasData / hasGaps per day from sea level and swell height', () => {
      const days = buildMarineDays(mk(12, 24 * 8 + 21))
      expect(days[7]).toMatchObject({ hasData: true, hasGaps: false })
      expect(days[8]).toMatchObject({ hasData: true, hasGaps: true }) // 9th day: data until 20h
      expect(days[11]).toMatchObject({ hasData: false, hasGaps: true })
    })

    it('firstGapIndex is the first day with any null, per location (dynamic)', () => {
      expect(firstGapIndex(buildMarineDays(mk(16)))).toBe(-1)
      expect(firstGapIndex(buildMarineDays(mk(16, 24 * 8 + 21)))).toBe(8)
      expect(firstGapIndex(buildMarineDays(mk(16, 24 * 3)))).toBe(3)
      expect(firstGapIndex(buildMarineDays(mk(16, 24 * 3 + 5)))).toBe(3)
    })
  })
})
