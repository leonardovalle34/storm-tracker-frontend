import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { TEMPERATURE_UNIT_KEY, useUnitsStore } from './units'

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
