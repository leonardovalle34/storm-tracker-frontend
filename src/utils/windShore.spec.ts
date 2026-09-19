import { describe, expect, it } from 'vitest'
import { windShoreType } from './windShore'

// Both directions are "coming FROM" bearings. The swell direction stands in for where the sea is:
// wind from the same side as the swell blows onshore; from the opposite side, offshore.
describe('windShoreType', () => {
  it.each([
    [180, 180, 'onshore'],
    [200, 180, 'onshore'], // 20° apart
    [225, 180, 'onshore'], // 45° apart (limit)
    [0, 180, 'offshore'],
    [340, 180, 'offshore'], // 160° apart
    [45, 180, 'offshore'], // 135° apart (limit)
    [90, 180, 'cross'],
    [270, 180, 'cross'],
    [10, 350, 'onshore'], // wraps around north
  ])('wind %s° with swell %s° is %s', (wind, swell, type) => {
    expect(windShoreType(wind, swell)).toBe(type)
  })
})
