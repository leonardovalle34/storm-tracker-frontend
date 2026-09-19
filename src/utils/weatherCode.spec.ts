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

  it('is unknown without a code (no precipitation-based guessing)', () => {
    expect(describeWeather(undefined).key).toBe('unknown')
    expect(describeWeather(null).key).toBe('unknown')
    expect(describeWeather(undefined, 12).key).toBe('unknown')
  })
})
