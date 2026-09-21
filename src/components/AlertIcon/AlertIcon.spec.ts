import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { useUnitsStore } from '@/stores/units'
import AlertIcon from './AlertIcon.vue'

const mk = (
  category: 'rain' | 'snow' | 'heat' | 'wind' | 'storm' | 'sea',
  severity: 'moderate' | 'high' | 'severe',
) => mount(AlertIcon, { props: { category, severity }, global: { plugins: [i18n] } })

describe('AlertIcon', () => {
  beforeEach(() => setLocale('pt'))

  it('is yellow for moderate, orange for high and red for severe', () => {
    expect(mk('wind', 'moderate').classes()).toContain('bg-wind-moderate')
    expect(mk('wind', 'high').classes()).toContain('bg-wind-strong')
    expect(mk('wind', 'severe').classes()).toContain('bg-wind-extreme')
  })

  it('has a tooltip and accessible name with category, level, meaning and the not-official note', () => {
    useUnitsStore().setWindUnit('km/h')
    const w = mk('wind', 'high')
    const text = w.attributes('title')!
    expect(w.attributes('aria-label')).toBe(text)
    expect(text).toContain('Vento (alto)')
    expect(text).toContain('60 a 100 km/h')
    expect(text).toContain('não é um alerta oficial')
    expect(text).toContain('Defesa Civil')
  })

  it('sea alerts carry the boating advice and point to the harbor master / Navy', () => {
    expect(mk('sea', 'high').attributes('title')).toContain('Não recomendado para embarcações pequenas')
    expect(mk('sea', 'severe').attributes('title')).toContain('Evitar navegação')
    expect(mk('sea', 'severe').attributes('title')).toContain('capitania dos portos')
    expect(mk('sea', 'severe').attributes('title')).toContain('Marinha')
  })

  it('always ends with the disclaimer, for every category and level', () => {
    for (const c of ['rain', 'snow', 'heat', 'wind', 'storm', 'sea'] as const)
      for (const s of ['moderate', 'high', 'severe'] as const)
        expect(mk(c, s).attributes('title')).toMatch(/não é um (alerta|aviso) oficial.*segurança\.$/)
  })

  it('heat: tooltip gives the feels-like limits in the chosen unit', () => {
    expect(mk('heat', 'moderate').attributes('title')).toContain('Calor (moderado)')
    expect(mk('heat', 'moderate').attributes('title')).toContain('33°C a 38°C')
    expect(mk('heat', 'severe').attributes('title')).toContain('acima de 44°C')
    useUnitsStore().setTemperature('F')
    expect(mk('heat', 'high').attributes('title')).toContain('100°F a 111°F') // 38 C, 44 C
    expect(mk('heat', 'high').attributes('title')).toContain('Defesa Civil')
  })

  it('shows the wind limits in knots when that unit is chosen (thresholds stay defined in km/h)', () => {
    useUnitsStore().setWindUnit('kn')
    expect(mk('wind', 'high').attributes('title')).toContain('32 a 54 kt') // 60 / 100 km/h
    expect(mk('wind', 'moderate').attributes('title')).toContain('22 a 32 kt') // 40 / 60 km/h
    expect(mk('wind', 'severe').attributes('title')).toContain('acima de 54 kt')
    expect(mk('sea', 'high').attributes('title')).toContain('27 kt') // 50 km/h
    useUnitsStore().setWindUnit('km/h')
    expect(mk('wind', 'high').attributes('title')).toContain('60 a 100 km/h')
    expect(mk('sea', 'severe').attributes('title')).toContain('60 km/h')
  })

  it('translates', () => {
    setLocale('en')
    expect(mk('sea', 'severe').attributes('title')).toContain('Avoid navigation')
    setLocale('es')
    expect(mk('sea', 'severe').attributes('title')).toContain('Evitar la navegación')
  })
})
