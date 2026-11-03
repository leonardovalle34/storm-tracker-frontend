import { describe, expect, it } from 'vitest'
import { describeWeather } from './weatherCode'

describe('describeWeather', () => {
  it.each([
    [0, 'clear'],
    [2, 'partlyCloudy'],
    [3, 'overcast'],
    [45, 'fog'],
    [53, 'drizzle'],
    [63, 'rain'],
    [75, 'snow'],
    [81, 'showers'],
    [95, 'thunderstorm'],
  ])('WMO code %s maps to %s with an icon', (code, key) => {
    const r = describeWeather(code)
    expect(r.key).toBe(key)
    expect(r.icon).toBeTruthy()
  })

  it.each([
    [0, '☀️', '🌙'],
    [1, '⛅', '☁️'],
    [2, '⛅', '☁️'],
    [3, '☁️', '☁️'],
    [80, '🌦️', '🌧️'],
    [81, '🌦️', '🌧️'],
    [82, '🌦️', '🌧️'],
  ])('code %s: %s by day, %s at night (is_day = 0), same key', (code, day, night) => {
    expect(describeWeather(code, 1).icon).toBe(day)
    expect(describeWeather(code, 0).icon).toBe(night)
    expect(describeWeather(code, 0).key).toBe(describeWeather(code, 1).key)
  })

  it('defaults to the day icon when is_day is missing', () => {
    expect(describeWeather(0).icon).toBe('☀️')
    expect(describeWeather(0, null).icon).toBe('☀️')
  })

  it('keeps sunless icons at night', () => {
    expect(describeWeather(95, 0).icon).toBe('⛈️')
    expect(describeWeather(63, 0).icon).toBe('🌧️')
  })

  it('is unknown without a code (no precipitation-based guessing)', () => {
    expect(describeWeather(undefined).key).toBe('unknown')
    expect(describeWeather(null).key).toBe('unknown')
  })
})
