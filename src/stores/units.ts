import { defineStore } from 'pinia'
import type { TempUnit } from '@/utils/temperature'

export const TEMPERATURE_UNIT_KEY = 'storm-track:temperature-unit'

function read(): TempUnit {
  try {
    return localStorage.getItem(TEMPERATURE_UNIT_KEY) === 'F' ? 'F' : 'C'
  } catch {
    return 'C'
  }
}

/** Display units, saved in localStorage. The API is always Celsius; only what is shown changes. */
export const useUnitsStore = defineStore('units', {
  state: () => ({
    temperature: read() as TempUnit,
  }),

  actions: {
    setTemperature(unit: TempUnit) {
      this.temperature = unit
      try {
        localStorage.setItem(TEMPERATURE_UNIT_KEY, unit)
      } catch {
        /* storage unavailable: keep it for this session */
      }
    },

    toggleTemperature() {
      this.setTemperature(this.temperature === 'C' ? 'F' : 'C')
    },
  },
})
