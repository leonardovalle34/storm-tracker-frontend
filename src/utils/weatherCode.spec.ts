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

  it('falls back to precipitation when the code is missing', () => {
    expect(describeWeather(undefined, 12).key).toBe('rain')
    expect(describeWeather(undefined, 2).key).toBe('showers')
    expect(describeWeather(undefined, 0).key).toBe('unknown')
    expect(describeWeather(undefined).key).toBe('unknown')
  })
})
