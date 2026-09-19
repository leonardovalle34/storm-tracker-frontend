import { describe, expect, it } from 'vitest'
import type { DailyForecast } from '@/types/weather'
import {
  buildDayAlerts,
  classifyHeatSeverity,
  classifyRainSeverity,
  classifySnowSeverity,
  classifySeaSeverity,
  classifyStormSeverity,
  classifyWindSeverity,
  knotsToKmh,
  upcomingWarnings,
  WARNING_DAYS,
} from './alerts'

describe('knotsToKmh', () => {
  it('converts with 1 kt = 1.852 km/h', () => {
    expect(knotsToKmh(0)).toBe(0)
    expect(knotsToKmh(10)).toBeCloseTo(18.52)
    expect(knotsToKmh(54)).toBeCloseTo(100.008)
  })
})

describe('classifyRainSeverity (daily precipitation, mm)', () => {
  it.each([
    [0, 'none'],
    [19.9, 'none'],
    [20, 'moderate'],
    [49.9, 'moderate'],
    [50, 'high'],
    [99.9, 'high'],
    [100, 'severe'],
    [250, 'severe'],
  ] as const)('%s mm -> %s', (mm, expected) => {
    expect(classifyRainSeverity(mm)).toBe(expected)
  })

  it('treats a missing value as none', () => {
    expect(classifyRainSeverity(null)).toBe('none')
    expect(classifyRainSeverity(undefined)).toBe('none')
  })
})

describe('classifySnowSeverity (daily precipitation as water equivalent, mm)', () => {
  it.each([
    [0, 'none'],
    [4.9, 'none'],
    [5, 'moderate'],
    [14.9, 'moderate'],
    [15, 'high'],
    [29.9, 'high'],
    [30, 'severe'],
  ] as const)('%s mm -> %s', (mm, expected) => {
    expect(classifySnowSeverity(mm)).toBe(expected)
  })

  it('treats a missing value as none', () => {
    expect(classifySnowSeverity(null)).toBe('none')
  })
})

describe('classifyHeatSeverity (daily max apparent temperature, °C)', () => {
  it.each([
    [-5, 'none'],
    [25, 'none'],
    [32.9, 'none'],
    [33, 'moderate'], // lower bound is inclusive
    [37.9, 'moderate'],
    [38, 'high'],
    [44, 'high'], // 44 is still high: severe is strictly above
    [44.1, 'severe'],
    [52, 'severe'],
  ] as const)('%s °C -> %s', (c, expected) => {
    expect(classifyHeatSeverity(c)).toBe(expected)
  })

  it('treats a missing value as none', () => {
    expect(classifyHeatSeverity(null)).toBe('none')
    expect(classifyHeatSeverity(undefined)).toBe('none')
  })
})

describe('classifyWindSeverity (km/h)', () => {
  it.each([
    [0, 'none'],
    [39.9, 'none'],
    [40, 'moderate'], // lower bound is inclusive
    [59.9, 'moderate'],
    [60, 'high'],
    [100, 'high'], // 100 is still high: severe is strictly above
    [100.1, 'severe'],
    [150, 'severe'],
  ] as const)('%s km/h -> %s', (kmh, expected) => {
    expect(classifyWindSeverity(kmh)).toBe(expected)
  })

  it('treats a missing value as none', () => {
    expect(classifyWindSeverity(null)).toBe('none')
  })
})

describe('classifyStormSeverity (WMO weather_code)', () => {
  it('95 (thunderstorm) is moderate', () => {
    expect(classifyStormSeverity(95)).toBe('moderate')
  })

  it.each([96, 99])('%s (thunderstorm with hail) is severe', (code) => {
    expect(classifyStormSeverity(code)).toBe('severe')
  })

  it.each([0, 3, 45, 61, 65, 80, 82, 94, 97, 98])('%s is none', (code) => {
    expect(classifyStormSeverity(code)).toBe('none')
  })

  it('treats a missing code as none', () => {
    expect(classifyStormSeverity(null)).toBe('none')
    expect(classifyStormSeverity(undefined)).toBe('none')
  })
})

describe('classifySeaSeverity (wave height m, wind km/h)', () => {
  it.each([
    [0, 0, 'none'],
    [1.99, 49.9, 'none'],
    [2, 0, 'moderate'],
    [2.49, 49.9, 'moderate'],
    [2.5, 0, 'high'],
    [3.49, 0, 'high'],
    [3.5, 0, 'severe'],
    [5, 0, 'severe'],
  ] as const)('wave %s m, wind %s km/h -> %s', (wave, wind, expected) => {
    expect(classifySeaSeverity(wave, wind)).toBe(expected)
  })

  it('wind alone can raise it, even with a calm sea (wave below every threshold)', () => {
    expect(classifySeaSeverity(0.5, 50)).toBe('high')
    expect(classifySeaSeverity(0.5, 59.9)).toBe('high')
    expect(classifySeaSeverity(0.5, 60)).toBe('severe')
    expect(classifySeaSeverity(0, 45)).toBe('none') // 45 km/h alone is not enough
  })

  it('the worse of wave and wind wins', () => {
    expect(classifySeaSeverity(3.5, 10)).toBe('severe')
    expect(classifySeaSeverity(2.5, 60)).toBe('severe')
    expect(classifySeaSeverity(2, 50)).toBe('high') // moderate wave, high wind
  })

  it('ignores a missing input and judges with the other one', () => {
    expect(classifySeaSeverity(null, 55)).toBe('high')
    expect(classifySeaSeverity(3, null)).toBe('high')
    expect(classifySeaSeverity(null, null)).toBe('none')
  })
})

describe('buildDayAlerts', () => {
  const day = (date: string) =>
    Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, '0')}:00`)
  const daily = (over: Partial<DailyForecast> = {}): DailyForecast => ({
    time: ['2026-09-19', '2026-09-20'],
    temperature_2m_max: [30, 30],
    temperature_2m_min: [20, 20],
    precipitation_sum: [0, 0],
    weather_code: [0, 0],
    ...over,
  })
  const hourly = (kts: [number, number]) => ({
    time: [...day('2026-09-19'), ...day('2026-09-20')],
    wind_speed_10m: [...Array(24).fill(kts[0]), ...Array(24).fill(kts[1])] as number[],
    wind_direction_10m: Array(48).fill(0) as number[],
  })
  const marine = (waves: [number | null, number | null]) => ({
    time: [...day('2026-09-19'), ...day('2026-09-20')],
    wave_height: [...Array(24).fill(waves[0]), ...Array(24).fill(waves[1])] as (number | null)[],
    swell_wave_height: [],
    swell_wave_direction: [],
    swell_wave_period: [],
    sea_level_height_msl: [],
    sea_surface_temperature: [],
  })

  it('returns one entry per day, empty when nothing is active', () => {
    const r = buildDayAlerts({ daily: daily(), hourly: hourly([5, 5]) })
    expect(r).toEqual([
      { date: '2026-09-19', alerts: [] },
      { date: '2026-09-20', alerts: [] },
    ])
  })

  it('classifies rain from the daily total and storm from the daily weather code', () => {
    const r = buildDayAlerts({ daily: daily({ precipitation_sum: [60, 0], weather_code: [0, 96] }) })
    expect(r[0].alerts).toEqual([{ category: 'rain', severity: 'high' }])
    expect(r[1].alerts).toEqual([{ category: 'storm', severity: 'severe' }])
  })

  it('classifies heat from the daily max apparent temperature', () => {
    const d = daily()
    d.apparent_temperature_max = [35, 46]
    const r = buildDayAlerts({ daily: d })
    expect(r[0].alerts).toEqual([{ category: 'heat', severity: 'moderate' }])
    expect(r[1].alerts).toEqual([{ category: 'heat', severity: 'severe' }])
  })

  it('uses the apparent temperature, not the air temperature', () => {
    const d = daily()
    d.temperature_2m_max = [40, 40] // hot air...
    d.apparent_temperature_max = [30, 30] // ...but it does not feel that hot
    expect(buildDayAlerts({ daily: d }).flatMap((x) => x.alerts)).toEqual([])
  })

  it('has no heat alert when the backend does not send the field yet', () => {
    const r = buildDayAlerts({ daily: daily() }) // no apparent_temperature_max
    expect(r.flatMap((x) => x.alerts.map((a) => a.category))).not.toContain('heat')
  })

  it.each([71, 73, 75, 77, 85, 86])('a snow day (code %s) is a snow alert, never a rain alert', (code) => {
    const r = buildDayAlerts({ daily: daily({ precipitation_sum: [60, 0], weather_code: [code, 0] }) })
    expect(r[0].alerts).toEqual([{ category: 'snow', severity: 'severe' }])
  })

  it('a thunderstorm code on a day that never gets above freezing is snow, not a storm (Andes, 4000 m)', () => {
    // real case: -34.6146,-70.3329 on 2026-09-20: daily code 95, max -10.7 C, 60.7 mm (42 cm of snow)
    const d = daily({ precipitation_sum: [60.7, 60.7], weather_code: [95, 95] })
    d.temperature_2m_max = [-10.7, 25]
    const r = buildDayAlerts({ daily: d })
    expect(r[0].alerts).toEqual([{ category: 'snow', severity: 'severe' }]) // no storm alert
    expect(r[1].alerts.map((a) => a.category)).toEqual(['rain', 'storm']) // a warm day is still a real storm
  })

  it('a day at exactly 0 C max still counts as frozen; above it does not', () => {
    const d = daily({ precipitation_sum: [10, 10], weather_code: [96, 96] })
    d.temperature_2m_max = [0, 0.1]
    const r = buildDayAlerts({ daily: d })
    expect(r[0].alerts.map((a) => a.category)).toEqual(['snow'])
    expect(r[1].alerts.map((a) => a.category)).toEqual(['storm'])
  })

  it('snow uses its own (lower) thresholds', () => {
    const r = buildDayAlerts({ daily: daily({ precipitation_sum: [8, 8], weather_code: [73, 61] }) })
    expect(r[0].alerts).toEqual([{ category: 'snow', severity: 'moderate' }]) // 8 mm of snow
    expect(r[1].alerts).toEqual([]) // 8 mm of rain is nothing
  })

  it('freezing rain and hail-free rain codes stay rain', () => {
    const r = buildDayAlerts({ daily: daily({ precipitation_sum: [60, 60], weather_code: [67, 65] }) })
    expect(r.map((d) => d.alerts[0].category)).toEqual(['rain', 'rain'])
  })

  it('classifies wind from the strongest hour of the day (knots -> km/h)', () => {
    const h = hourly([5, 5])
    h.wind_speed_10m[10] = 25 // 46.3 km/h on day 1
    h.wind_speed_10m[24 + 10] = 60 // 111 km/h on day 2
    const r = buildDayAlerts({ daily: daily(), hourly: h })
    expect(r[0].alerts).toEqual([{ category: 'wind', severity: 'moderate' }])
    expect(r[1].alerts).toEqual([{ category: 'wind', severity: 'severe' }])
  })

  it('adds sea only when there is ocean data, using the day max wave and wind', () => {
    const r = buildDayAlerts({ daily: daily(), hourly: hourly([5, 5]), marine: marine([2.6, 1]) })
    expect(r[0].alerts).toEqual([{ category: 'sea', severity: 'high' }])
    expect(r[1].alerts).toEqual([])
  })

  it('sea can be high from wind alone, and then the wind alert is there too', () => {
    const r = buildDayAlerts({ daily: daily(), hourly: hourly([28, 5]), marine: marine([0.5, 0.5]) }) // 51.9 km/h
    expect(r[0].alerts).toEqual([
      { category: 'wind', severity: 'moderate' },
      { category: 'sea', severity: 'high' },
    ])
  })

  it('never reports sea for an inland location (no wave data)', () => {
    const inland = marine([null, null])
    const r = buildDayAlerts({ daily: daily(), hourly: hourly([40, 40]), marine: inland })
    expect(r.flatMap((d) => d.alerts.map((a) => a.category))).not.toContain('sea')
    expect(
      buildDayAlerts({ daily: daily(), hourly: hourly([40, 40]), marine: null })[0].alerts.map(
        (a) => a.category,
      ),
    ).toEqual(['wind'])
  })

  it('keeps a stable category order: rain, heat, wind, storm, sea (snow takes the place of rain)', () => {
    const dd = daily({ precipitation_sum: [120, 0], weather_code: [99, 0] })
    dd.apparent_temperature_max = [45, 20]
    const r = buildDayAlerts({
      daily: dd,
      hourly: hourly([40, 5]),
      marine: marine([4, 0]),
    })
    expect(r[0].alerts.map((a) => a.category)).toEqual(['rain', 'heat', 'wind', 'storm', 'sea'])
  })
})

describe('upcomingWarnings (next 3 days, high or severe only)', () => {
  type A = {
    category: 'rain' | 'snow' | 'heat' | 'wind' | 'storm' | 'sea'
    severity: 'moderate' | 'high' | 'severe'
  }
  const d = (alerts: A[], date = 'x') => ({ date, alerts })
  const quiet = (n: number) => Array.from({ length: n }, () => d([]))

  it('looks 3 days ahead', () => {
    expect(WARNING_DAYS).toBe(3)
  })

  it('is empty when nothing reaches high', () => {
    expect(upcomingWarnings([d([{ category: 'rain', severity: 'moderate' }]), ...quiet(2)])).toEqual([])
  })

  it('reports each category once, at its worst level, with the days at high or severe', () => {
    const r = upcomingWarnings([
      d([{ category: 'wind', severity: 'high' }], 'd1'),
      d(
        [
          { category: 'wind', severity: 'severe' },
          { category: 'storm', severity: 'severe' },
        ],
        'd2',
      ),
      d([{ category: 'sea', severity: 'high' }], 'd3'),
    ])
    expect(r).toEqual([
      { category: 'wind', severity: 'severe', dates: ['d1', 'd2'] },
      { category: 'storm', severity: 'severe', dates: ['d2'] },
      { category: 'sea', severity: 'high', dates: ['d3'] },
    ])
  })

  it('leaves moderate days out of a category’s dates', () => {
    const r = upcomingWarnings([
      d([{ category: 'snow', severity: 'moderate' }], 'd1'),
      d([{ category: 'snow', severity: 'high' }], 'd2'),
    ])
    expect(r).toEqual([{ category: 'snow', severity: 'high', dates: ['d2'] }])
  })

  it('does not look past the third day (Everest: snow on days 6-8 stays on the cards only)', () => {
    const days = [
      ...quiet(5),
      d([{ category: 'snow', severity: 'high' }], '2026-09-24'),
      d([{ category: 'snow', severity: 'severe' }], '2026-09-26'),
    ]
    expect(upcomingWarnings(days)).toEqual([])
  })

  it('includes heat in the banner when it is high or severe', () => {
    const r = upcomingWarnings([d([{ category: 'heat', severity: 'high' }], 'd1'), ...quiet(2)])
    expect(r).toEqual([{ category: 'heat', severity: 'high', dates: ['d1'] }])
  })

  it('ignores days after the window', () => {
    const r = upcomingWarnings([...quiet(3), d([{ category: 'storm', severity: 'severe' }])])
    expect(r).toEqual([])
  })
})
