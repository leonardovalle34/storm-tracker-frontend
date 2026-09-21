import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { WIND_UNIT_KEY, useUnitsStore } from '@/stores/units'
import WindUnitToggle from './WindUnitToggle.vue'

const mk = () => mount(WindUnitToggle, { global: { plugins: [i18n] } })

describe('WindUnitToggle', () => {
  it('offers kt and km/h, with knots selected by default', () => {
    const w = mk()
    expect(w.findAll('button').map((b) => b.text())).toEqual(['kt', 'km/h'])
    expect(w.get('[data-unit="kn"]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-unit="km/h"]').attributes('aria-pressed')).toBe('false')
  })

  it('choosing km/h switches the store and saves it, without touching the temperature unit', async () => {
    const w = mk()
    await w.get('[data-unit="km/h"]').trigger('click')
    expect(useUnitsStore().windUnit).toBe('km/h')
    expect(useUnitsStore().temperature).toBe('C')
    expect(localStorage.getItem(WIND_UNIT_KEY)).toBe('km/h')
    expect(w.get('[data-unit="km/h"]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-unit="kn"]').attributes('aria-pressed')).toBe('false')
    await w.get('[data-unit="kn"]').trigger('click')
    expect(useUnitsStore().windUnit).toBe('kn')
  })

  it('shows the saved unit', () => {
    useUnitsStore().setWindUnit('km/h')
    expect(mk().get('[data-unit="km/h"]').attributes('aria-pressed')).toBe('true')
  })

  it('looks like the temperature toggle (same group styling)', () => {
    const cls = mk().get('[role="group"]').classes()
    expect(cls).toEqual(expect.arrayContaining(['inline-flex', 'h-9', 'rounded-md', 'border-white/30']))
  })

  it('is a labelled group with a tooltip, translated', () => {
    setLocale('pt')
    const w = mk()
    expect(w.get('[role="group"]').attributes('aria-label')).toBe('Unidade de vento')
    expect(w.get('[role="group"]').attributes('title')).toContain('nós e km/h')
    setLocale('en')
    expect(mk().get('[role="group"]').attributes('aria-label')).toBe('Wind unit')
    setLocale('pt')
  })
})
