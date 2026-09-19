import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import AlertIcon from './AlertIcon.vue'

const mk = (category: 'rain' | 'snow' | 'wind' | 'storm' | 'sea', severity: 'moderate' | 'high' | 'severe') =>
  mount(AlertIcon, { props: { category, severity }, global: { plugins: [i18n] } })

describe('AlertIcon', () => {
  beforeEach(() => setLocale('pt'))

  it('is yellow for moderate, orange for high and red for severe', () => {
    expect(mk('wind', 'moderate').classes()).toContain('bg-wind-moderate')
    expect(mk('wind', 'high').classes()).toContain('bg-wind-strong')
    expect(mk('wind', 'severe').classes()).toContain('bg-wind-extreme')
  })

  it('has a tooltip and accessible name with category, level, meaning and the not-official note', () => {
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
    for (const c of ['rain', 'snow', 'wind', 'storm', 'sea'] as const)
      for (const s of ['moderate', 'high', 'severe'] as const)
        expect(mk(c, s).attributes('title')).toMatch(/não é um (alerta|aviso) oficial.*segurança\.$/)
  })

  it('translates', () => {
    setLocale('en')
    expect(mk('sea', 'severe').attributes('title')).toContain('Avoid navigation')
    setLocale('es')
    expect(mk('sea', 'severe').attributes('title')).toContain('Evitar la navegación')
  })
})
