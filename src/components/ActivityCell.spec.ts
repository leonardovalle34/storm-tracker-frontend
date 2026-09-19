import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import type { Recommendation } from '@/utils/activityPlanner'
import ActivityCell from './ActivityCell.vue'

const base: Recommendation = { activity: 'surf', score: 92, label: 'great', start: 7, end: 9 }
const mk = (r: Recommendation) =>
  mount(ActivityCell, { props: { recommendation: r }, global: { plugins: [i18n] } })

describe('ActivityCell', () => {
  setLocale('pt')

  it('shows the qualitative badge and the time range on one roomy line', () => {
    const w = mk(base)
    expect(w.get('[data-testid="activity-badge"]').text()).toBe('Ótimo')
    expect(w.text()).toContain('7h–10h')
  })

  it.each([
    ['great', 'bg-wind-calm', 'Ótimo'],
    ['good', 'bg-wind-moderate', 'Bom'],
    ['fair', 'bg-wind-strong', 'Razoável'],
    ['poor', 'bg-wind-extreme', 'Ruim'],
  ] as const)('%s uses the AA-checked %s token', (label, cls, text) => {
    const b = mk({ ...base, label }).get('[data-testid="activity-badge"]')
    expect(b.classes()).toContain(cls)
    expect(b.text()).toBe(text)
  })

  it('shows "Não recomendado — tempestade" when stormy, without a time range', () => {
    const w = mk({ activity: 'surf', score: 0, label: 'stormy', start: null, end: null })
    expect(w.text()).toBe('Não recomendado — tempestade')
  })

  it('shows a dash without data', () => {
    expect(mk({ activity: 'surf', score: null, label: null, start: null, end: null }).text()).toBe('–')
  })
})
