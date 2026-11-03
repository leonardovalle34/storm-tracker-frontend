import { describe, expect, it } from 'vitest'
import { dailyCondition, dayCondition, LIMIT_HOURS, LIMIT_MM, SCORE_TABLE } from './dailyCondition'

const DATE = '2026-09-19'
const TIME = Array.from({ length: 24 }, (_, h) => `${DATE}T${String(h).padStart(2, '0')}:00`)
const DAYLIGHT = (h: number) => h >= 6 && h < 18 // 12 daylight hours

/** one day of 24 hours, daylight 6h-17h; `code` and `mm` give each hour's values */
const day = (
  code: (hour: number) => number | null,
  mm: (hour: number) => number = () => 0,
  dailyCode: number | null = 95,
) => ({
  time: TIME,
  codes: TIME.map((_, h) => code(h)),
  isDay: TIME.map((_, h) => (DAYLIGHT(h) ? 1 : 0)),
  precipitation: TIME.map((_, h) => mm(h)),
  precipitationSum: 99, // daily total (night included): ignored when there is hourly precipitation
  dailyCode,
})

describe('dailyCondition', () => {
  it('limits and the score table are named constants', () => {
    expect(LIMIT_MM).toBe(5)
    expect(LIMIT_HOURS).toBe(3)
    expect(SCORE_TABLE.map((r) => r.score)).toEqual([0, 1, 2, 3, 4, 5])
    expect(SCORE_TABLE[2].codes).toEqual([3, 45, 48])
  })

  describe('icon by the daytime average', () => {
    it('8 h of sun + 4 overcast (average ~0.67): clear, since partly cloudy did not occur', () => {
      const r = dailyCondition(day((h) => (h >= 6 && h < 14 ? 0 : 3)))
      expect(r.averageScore).toBeCloseTo(2 / 3)
      expect(r).toMatchObject({ code: 0, isolated: 'none' })
    })

    it('the same day with one partly cloudy hour (average 0.75): partly cloudy, now present', () => {
      const r = dailyCondition(day((h) => (h === 6 ? 2 : h >= 7 && h < 14 ? 0 : 3)))
      expect(r.averageScore).toBeCloseTo(0.75)
      expect(r.code).toBe(2)
    })

    it('never returns a category absent from the daylight hours', () => {
      // 6 clear + 6 thunder = 2.5: overcast (2) and drizzle (3) are closer but did not occur
      const r = dailyCondition(day((h) => (h < 12 ? 0 : 95)))
      expect(r.averageScore).toBe(2.5)
      expect([0, 95]).toContain(r.code)
    })

    it('tie in distance to the average: the more severe category', () => {
      // 6 clear (0) + 6 overcast (2): average 1, both at distance 1
      expect(dailyCondition(day((h) => (h < 12 ? 0 : 3))).code).toBe(3)
    })

    it('within the chosen category, its most frequent daylight code', () => {
      expect(dailyCondition(day((h) => (h >= 6 && h < 10 ? 0 : 1))).code).toBe(1) // 1 x8, 0 x4
      expect(dailyCondition(day((h) => (h < 12 ? 45 : 3))).code).toBe(45) // fog x6 vs overcast x6: higher code
    })

    it('night hours do not count, even stormy ones', () => {
      expect(
        dailyCondition(
          day(
            (h) => (DAYLIGHT(h) ? 0 : 95),
            (h) => (DAYLIGHT(h) ? 0 : 3),
          ),
        ),
      ).toMatchObject({
        code: 0,
        isolated: 'none',
        averageScore: 0,
        rainHours: 0,
        precipitationSum: 0,
      })
    })
  })

  describe('rain', () => {
    it('sunny day with 1 hour of 0.4 mm: sun + isolated rain', () => {
      const r = dailyCondition(
        day(
          (h) => (h === 15 ? 61 : 0),
          (h) => (h === 15 ? 0.4 : 0),
        ),
      )
      expect(r).toMatchObject({
        code: 0,
        isolated: 'rain',
        rainHours: 1,
        rainWindow: { start: '14:00', end: '15:00' }, // the 15:00 value is the rain of 14h-15h
        precipitationSum: 0.4,
      })
    })

    it('drizzle only before dawn is ignored: no isolated rain', () => {
      const r = dailyCondition(
        day(
          (h) => (h === 2 || h === 3 ? 53 : 3),
          (h) => (h === 2 || h === 3 ? 0.3 : 0),
        ),
      )
      expect(r).toMatchObject({ code: 3, isolated: 'none', rainHours: 0, precipitationSum: 0 })
      expect(r.rainWindow).toBeUndefined()
    })

    it('drizzle code with 0 mm: no isolated rain (the code alone is not rain)', () => {
      const r = dailyCondition(day((h) => (h === 11 ? 51 : 0)))
      expect(r).toMatchObject({ code: 0, isolated: 'none', rainHours: 0 })
    })

    it('1 hour of thunderstorm and 2 mm by day: the dry average + isolated thunder', () => {
      const r = dailyCondition(
        day(
          (h) => (h === 16 ? 95 : 2),
          (h) => (h === 16 ? 2 : 0),
        ),
      )
      expect(r).toMatchObject({ code: 2, isolated: 'thunder', rainHours: 1, precipitationSum: 2 })
    })

    it('3 hours of rain and 9 of sun: relevant rain wins over the average', () => {
      const wet = (h: number) => h >= 13 && h < 16
      const r = dailyCondition(
        day(
          (h) => (wet(h) ? 63 : 0),
          (h) => (wet(h) ? 0.5 : 0),
        ),
      )
      expect(r.averageScore).toBe(1) // 3 x 4 / 12
      expect(r).toMatchObject({ code: 63, isolated: 'none', rainHours: 3, precipitationSum: 1.5 })
    })

    it(`>= ${LIMIT_MM} mm by day in 1 hour is relevant too, and takes the most severe precipitation`, () => {
      const r = dailyCondition(
        day(
          (h) => (h === 9 ? 95 : h === 10 ? 61 : 0),
          (h) => (h === 9 ? 6 : 0),
        ),
      )
      expect(r).toMatchObject({ code: 95, isolated: 'none' })
    })

    it('relevant rain without a precipitation code keeps the average, not isolated', () => {
      const r = dailyCondition(
        day(
          () => 3,
          (h) => (h >= 8 && h < 12 ? 2 : 0),
        ),
      )
      expect(r).toMatchObject({ code: 3, isolated: 'none', rainHours: 4, precipitationSum: 8 })
    })

    it('a precipitation result is never "isolated"', () => {
      expect(
        dailyCondition(
          day(
            () => 51,
            (h) => (h === 9 ? 0.2 : 0),
          ),
        ).isolated,
      ).toBe('none')
    })
  })

  it('a day without daylight hours (polar night) uses all hours, rain included', () => {
    const d = day(
      (h) => (h < 16 ? 2 : 3),
      (h) => (h === 3 ? 0.2 : 0),
    )
    expect(dailyCondition({ ...d, isDay: d.isDay.map(() => 0) })).toMatchObject({
      code: 2,
      isolated: 'rain',
      rainHours: 1,
    })
  })

  it('no hourly data: the daily code, isolated none, the daily precipitation_sum', () => {
    expect(dailyCondition({ dailyCode: 95, precipitationSum: 12 })).toEqual({
      code: 95,
      isolated: 'none',
      averageScore: 5,
      rainHours: 0,
      precipitationSum: 12,
    })
    expect(dailyCondition({ codes: [null, null], dailyCode: 63 })).toMatchObject({
      code: 63,
      isolated: 'none',
    })
    expect(dailyCondition({}).code).toBeNull()
  })

  it('hourly codes but no hourly precipitation: the daily sum decides relevant rain', () => {
    const d = { ...day((h) => (h === 10 ? 61 : 0)), precipitation: undefined }
    expect(dailyCondition({ ...d, precipitationSum: 1 })).toMatchObject({ code: 0, isolated: 'none' })
    expect(dailyCondition({ ...d, precipitationSum: 6 })).toMatchObject({ code: 61, precipitationSum: 6 })
  })

  it('ignores codes outside the WMO table', () => {
    expect(dailyCondition({ codes: [42, 42, 2], dailyCode: 95 }).code).toBe(2)
  })
})

describe('dayCondition', () => {
  const time = ['2026-09-19', '2026-09-20'].flatMap((d) =>
    Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`),
  )
  const daily = { time: ['2026-09-19', '2026-09-20'], weather_code: [95, 95], precipitation_sum: [0, 0.4] }

  it('takes only the hours of day i', () => {
    const hourly = {
      time,
      weather_code: time.map((_, i) => (i < 24 ? 0 : 3)),
      is_day: time.map(() => 1),
      precipitation: time.map((_, i) => (i === 24 + 15 ? 0.4 : 0)),
    }
    expect(dayCondition(daily, hourly, 0)).toMatchObject({ code: 0, isolated: 'none' })
    expect(dayCondition(daily, hourly, 1)).toMatchObject({
      code: 3,
      isolated: 'rain',
      rainWindow: { start: '14:00', end: '15:00' },
    })
  })

  it('falls back to the daily code without hourly codes', () => {
    expect(dayCondition(daily, { time }, 1)).toMatchObject({ code: 95, isolated: 'none' })
    expect(dayCondition(daily, null, 0)).toMatchObject({ code: 95, isolated: 'none' })
  })
})
