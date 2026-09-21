import { defineStore } from 'pinia'
import type { TempUnit } from '@/utils/temperature'
import type { WindUnit } from '@/utils/wind'

export const TEMPERATURE_UNIT_KEY = 'storm-track:temperature-unit'
export const WIND_UNIT_KEY = 'storm-track:wind-unit'

function read(): TempUnit {
  try {
    return localStorage.getItem(TEMPERATURE_UNIT_KEY) === 'F' ? 'F' : 'C'
  } catch {
    return 'C'
  }
}

function readWind(): WindUnit {
  try {
    return localStorage.getItem(WIND_UNIT_KEY) === 'km/h' ? 'km/h' : 'kn'
  } catch {
    return 'kn'
  }
}

/** Display units, saved in localStorage. The API is always Celsius and knots; only what is shown changes. */
export const useUnitsStore = defineStore('units', {
  state: () => ({
    temperature: read() as TempUnit,
    windUnit: readWind() as WindUnit,
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

    setWindUnit(unit: WindUnit) {
      this.windUnit = unit
      try {
        localStorage.setItem(WIND_UNIT_KEY, unit)
      } catch {
        /* storage unavailable: keep it for this session */
      }
    },

    toggleWindUnit() {
      this.setWindUnit(this.windUnit === 'kn' ? 'km/h' : 'kn')
    },
  },
})
