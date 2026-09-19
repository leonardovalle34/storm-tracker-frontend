import { beforeEach, describe, expect, it } from 'vitest'
import { _resetSelectedLocation, useSelectedLocation } from './useSelectedLocation'

describe('useSelectedLocation', () => {
  beforeEach(() => _resetSelectedLocation())

  it('starts empty', () => {
    expect(useSelectedLocation().location.value).toBeNull()
  })

  it('is one shared state between all consumers (map click and search)', () => {
    const a = useSelectedLocation()
    const b = useSelectedLocation()
    a.select({ name: 'Santos', latitude: -23.9, longitude: -46.3 })
    expect(b.location.value?.name).toBe('Santos')
    b.selectCoords(10.1234567, 20.7654321)
    expect(a.location.value).toEqual({ name: '10.1235, 20.7654', latitude: 10.1234567, longitude: 20.7654321 })
  })
})
