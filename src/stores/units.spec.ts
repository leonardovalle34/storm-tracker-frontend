import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { TEMPERATURE_UNIT_KEY, WIND_UNIT_KEY, useUnitsStore } from './units'

describe('units store', () => {
  beforeEach(() => localStorage.clear())

  it('uses the storm-track:temperature-unit key', () => {
    expect(TEMPERATURE_UNIT_KEY).toBe('storm-track:temperature-unit')
  })

  it('defaults to Celsius', () => {
    expect(useUnitsStore().temperature).toBe('C')
  })

  it('setTemperature changes it and saves it', () => {
    const s = useUnitsStore()
    s.setTemperature('F')
    expect(s.temperature).toBe('F')
    expect(localStorage.getItem(TEMPERATURE_UNIT_KEY)).toBe('F')
  })

  it('toggleTemperature flips between C and F', () => {
    const s = useUnitsStore()
    s.toggleTemperature()
    expect(s.temperature).toBe('F')
    s.toggleTemperature()
    expect(s.temperature).toBe('C')
    expect(localStorage.getItem(TEMPERATURE_UNIT_KEY)).toBe('C')
  })

  it('restores the saved unit on the next visit', () => {
    localStorage.setItem(TEMPERATURE_UNIT_KEY, 'F')
    setActivePinia(createPinia())
    expect(useUnitsStore().temperature).toBe('F')
  })

  it('ignores an invalid saved value', () => {
    localStorage.setItem(TEMPERATURE_UNIT_KEY, 'K')
    setActivePinia(createPinia())
    expect(useUnitsStore().temperature).toBe('C')
  })

  it('keeps working when storage is unavailable', () => {
    const s = useUnitsStore()
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('denied')
    }
    try {
      expect(() => s.setTemperature('F')).not.toThrow()
      expect(s.temperature).toBe('F')
    } finally {
      Storage.prototype.setItem = orig
    }
  })
})

describe('units store: wind unit', () => {
  beforeEach(() => localStorage.clear())

  it('uses the storm-track:wind-unit key', () => {
    expect(WIND_UNIT_KEY).toBe('storm-track:wind-unit')
  })

  it('defaults to knots, the unit the API sends', () => {
    expect(useUnitsStore().windUnit).toBe('kn')
  })

  it('setWindUnit changes it and saves it', () => {
    const s = useUnitsStore()
    s.setWindUnit('km/h')
    expect(s.windUnit).toBe('km/h')
    expect(localStorage.getItem(WIND_UNIT_KEY)).toBe('km/h')
  })

  it('toggleWindUnit flips between kn and km/h', () => {
    const s = useUnitsStore()
    s.toggleWindUnit()
    expect(s.windUnit).toBe('km/h')
    s.toggleWindUnit()
    expect(s.windUnit).toBe('kn')
    expect(localStorage.getItem(WIND_UNIT_KEY)).toBe('kn')
  })

  it('is independent from the temperature unit', () => {
    const s = useUnitsStore()
    s.setWindUnit('km/h')
    expect(s.temperature).toBe('C')
    s.setTemperature('F')
    expect(s.windUnit).toBe('km/h')
  })

  it('restores the saved unit and ignores an invalid one', () => {
    localStorage.setItem(WIND_UNIT_KEY, 'km/h')
    setActivePinia(createPinia())
    expect(useUnitsStore().windUnit).toBe('km/h')
    localStorage.setItem(WIND_UNIT_KEY, 'mph')
    setActivePinia(createPinia())
    expect(useUnitsStore().windUnit).toBe('kn')
  })

  it('keeps working when storage is unavailable', () => {
    const s = useUnitsStore()
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('denied')
    }
    try {
      expect(() => s.setWindUnit('km/h')).not.toThrow()
      expect(s.windUnit).toBe('km/h')
    } finally {
      Storage.prototype.setItem = orig
    }
  })
})
