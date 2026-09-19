import { describe, expect, it } from 'vitest'
import { windyUrl } from './windy'

describe('windyUrl', () => {
  const loc = { latitude: -23.96, longitude: -46.33 }

  it('builds an embed2.html URL with overlay and coordinates', () => {
    const u = new URL(windyUrl(loc, 'rain'))
    expect(u.origin + u.pathname).toBe('https://embed.windy.com/embed2.html')
    expect(u.searchParams.get('overlay')).toBe('rain')
    expect(u.searchParams.get('lat')).toBe('-23.96')
    expect(u.searchParams.get('lon')).toBe('-46.33')
    expect(u.searchParams.get('menu')).toBe('')
  })

  it.each(['rain', 'wind', 'temp', 'waves', 'sst'] as const)('supports overlay %s', (o) => {
    expect(new URL(windyUrl(loc, o)).searchParams.get('overlay')).toBe(o)
  })

  it('shows temperatures in Celsius by default and in Fahrenheit when asked', () => {
    expect(new URL(windyUrl(loc, 'temp')).searchParams.get('metricTemp')).toBe('°C')
    expect(new URL(windyUrl(loc, 'temp', false, 'F')).searchParams.get('metricTemp')).toBe('°F')
  })

  it('expanded version shows the menu and uses a higher zoom', () => {
    const small = new URL(windyUrl(loc, 'temp'))
    const big = new URL(windyUrl(loc, 'temp', true))
    expect(big.searchParams.get('menu')).toBe('true')
    expect(Number(big.searchParams.get('zoom'))).toBeGreaterThan(Number(small.searchParams.get('zoom')))
  })
})
