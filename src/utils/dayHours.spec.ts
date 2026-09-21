import { describe, expect, it } from 'vitest'
import { buildDayHours } from './dayHours'

const times = (days: string[]) =>
  days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`))
const time = times(['2026-09-19', '2026-09-20'])

describe('buildDayHours', () => {
  it('returns all 24 hours (0..23) of the requested day, not the 3-hour columns', () => {
    const r = buildDayHours({ time, temperature_2m: time.map((_, i) => i) }, '2026-09-20', 63)
    expect(r.map((h) => h.hour)).toEqual(Array.from({ length: 24 }, (_, h) => h))
    expect(r[0].temp).toBe(24) // 2nd day starts at index 24
    expect(r[23].temp).toBe(47)
  })

  it('keeps temperatures as sent (Celsius): unit conversion is a display concern', () => {
    expect(buildDayHours({ time, temperature_2m: time.map(() => 25.4) }, '2026-09-19', 0)[5].temp).toBe(25.4)
  })

  it('uses the hourly weather_code of each hour when the backend sends it', () => {
    const codes = time.map((_, i) => (i % 24 === 14 ? 95 : 0))
    const r = buildDayHours(
      { time, temperature_2m: time.map(() => 20), weather_code: codes },
      '2026-09-19',
      63,
    )
    expect(r[13].weather).toMatchObject({ key: 'clear', icon: '☀️' })
    expect(r[14].weather).toMatchObject({ key: 'thunderstorm', icon: '⛈️' })
  })

  it('falls back to the daily code, repeated on every hour, when there is no hourly code', () => {
    const r = buildDayHours({ time, temperature_2m: time.map(() => 20) }, '2026-09-19', 63)
    expect(r.every((h) => h.weather.key === 'rain')).toBe(true)
  })

  it('falls back per hour when one hourly code is null', () => {
    const codes = time.map((_, i) => (i === 3 ? null : 0)) as (number | null)[]
    const r = buildDayHours(
      { time, temperature_2m: time.map(() => 20), weather_code: codes as number[] },
      '2026-09-19',
      63,
    )
    expect(r[3].weather.key).toBe('rain')
    expect(r[4].weather.key).toBe('clear')
  })

  it('gives null temperatures when the field or the hour is missing', () => {
    expect(buildDayHours({ time }, '2026-09-19', 0).every((h) => h.temp === null)).toBe(true)
    const r = buildDayHours({ time: ['2026-09-19T05:00'], temperature_2m: [18] }, '2026-09-19', 0)
    expect(r).toHaveLength(24)
    expect(r[5].temp).toBe(18)
    expect(r[6].temp).toBeNull()
  })

  it('returns 24 empty hours for a day that is not in the data', () => {
    const r = buildDayHours({ time, temperature_2m: time.map(() => 20) }, '2030-01-01', 0)
    expect(r).toHaveLength(24)
    expect(r.every((h) => h.temp === null)).toBe(true)
  })
})
