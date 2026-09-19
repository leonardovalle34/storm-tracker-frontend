import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { TEMPERATURE_UNIT_KEY, useUnitsStore } from '@/stores/units'
import UnitToggle from './UnitToggle.vue'

const mk = () => mount(UnitToggle, { global: { plugins: [i18n] } })

describe('UnitToggle', () => {
  it('offers °C and °F, with Celsius selected by default', () => {
    const w = mk()
    expect(w.findAll('button').map((b) => b.text())).toEqual(['°C', '°F'])
    expect(w.get('[data-unit="C"]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-unit="F"]').attributes('aria-pressed')).toBe('false')
  })

  it('choosing °F switches the store and saves it', async () => {
    const w = mk()
    await w.get('[data-unit="F"]').trigger('click')
    expect(useUnitsStore().temperature).toBe('F')
    expect(localStorage.getItem(TEMPERATURE_UNIT_KEY)).toBe('F')
    expect(w.get('[data-unit="F"]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-unit="C"]').attributes('aria-pressed')).toBe('false')
    await w.get('[data-unit="C"]').trigger('click')
    expect(useUnitsStore().temperature).toBe('C')
  })

  it('shows the saved unit', () => {
    useUnitsStore().setTemperature('F')
    expect(mk().get('[data-unit="F"]').attributes('aria-pressed')).toBe('true')
  })

  it('is a labelled group with a tooltip, translated', () => {
    setLocale('pt')
    const w = mk()
    expect(w.get('[role="group"]').attributes('aria-label')).toBe('Unidade de temperatura')
    expect(w.get('[role="group"]').attributes('title')).toContain('Celsius e Fahrenheit')
    setLocale('en')
    expect(mk().get('[role="group"]').attributes('aria-label')).toBe('Temperature unit')
    setLocale('pt')
  })
})
