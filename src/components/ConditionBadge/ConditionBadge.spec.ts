import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import ConditionBadge from './ConditionBadge.vue'

const mk = (props: { kind: 'uv' | 'clarity'; value: number }) =>
  mount(ConditionBadge, { props, global: { plugins: [i18n] } })

describe('ConditionBadge', () => {
  setLocale('pt')

  it('UV: shows the rounded index and its WHO level, colored by tone', () => {
    const w = mk({ kind: 'uv', value: 8.4 })
    expect(w.text()).toContain('8')
    expect(w.text()).toContain('Muito alto')
    expect(w.get('[data-testid="badge"]').classes()).toContain('bg-wind-extreme')
    expect(mk({ kind: 'uv', value: 1 }).get('[data-testid="badge"]').classes()).toContain('bg-wind-calm')
    expect(mk({ kind: 'uv', value: 4 }).text()).toContain('Moderado')
    expect(mk({ kind: 'uv', value: 12 }).text()).toContain('Extremo')
  })

  it('clarity: shows the level for a 0-100 score, flagged as an estimate', () => {
    const w = mk({ kind: 'clarity', value: 90 })
    expect(w.text()).toContain('Excelente')
    expect(w.get('[data-testid="badge"]').classes()).toContain('bg-wind-calm')
    expect(w.get('[data-testid="badge"]').attributes('title')).toContain('Estimativa')
    expect(mk({ kind: 'clarity', value: 10 }).text()).toContain('Baixa')
  })
})
