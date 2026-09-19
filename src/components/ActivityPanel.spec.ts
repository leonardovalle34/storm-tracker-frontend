import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import type { Recommendation } from '@/utils/activityPlanner'
import ActivityPanel from './ActivityPanel.vue'

const recs: Recommendation[] = [
  { activity: 'surf', score: 92, label: 'great', start: 7, end: 9 },
  { activity: 'kite', score: 70, label: 'good', start: 13, end: 15 },
  { activity: 'swimming', score: 40, label: 'fair', start: 10, end: 10 },
  { activity: 'diving', score: 10, label: 'poor', start: 6, end: 8 },
]
const mk = (r = recs) => mount(ActivityPanel, { props: { recommendations: r }, global: { plugins: [i18n] } })

describe('ActivityPanel', () => {
  setLocale('pt')

  it('has a titled panel with the four activities: icon + label + time range', () => {
    const w = mk()
    expect(w.get('[data-testid="activity-panel"]').text()).toContain('Atividades recomendadas')
    const items = w.findAll('[data-testid="activity"]')
    expect(items.map((i) => i.attributes('data-activity'))).toEqual(['surf', 'kite', 'swimming', 'diving'])
    expect(items[0].get('[data-testid="activity-icon"]').text()).toBe('🏄')
    expect(items[0].text()).toContain('Surf')
    expect(items[0].text()).toContain('Ótimo')
    expect(items[0].text()).toContain('7h–10h')
    expect(items[1].text()).toContain('Kite/Windsurf')
    expect(items[1].text()).toContain('Bom')
    expect(items[2].text()).toContain('Razoável')
    expect(items[3].text()).toContain('Ruim')
    expect(items[3].text()).toContain('6h–9h')
  })

  it('shows "Não recomendado — tempestade" when stormy', () => {
    const storm = recs.map((r) => ({ ...r, score: 0, label: 'stormy' as const, start: null, end: null }))
    const items = mk(storm).findAll('[data-testid="activity"]')
    expect(items).toHaveLength(4)
    expect(items.every((i) => i.text().includes('Não recomendado — tempestade'))).toBe(true)
  })

  it('shows a dash when an activity has no data', () => {
    const w = mk([{ activity: 'swimming', score: null, label: null, start: null, end: null }])
    expect(w.get('[data-testid="activity"]').text()).toContain('–')
  })

  it('uses the same intensity tokens (AA-checked) as the wind cells, one per level', () => {
    const cls = mk()
      .findAll('[data-testid="activity-badge"]')
      .map((b) => b.classes().join(' '))
    expect(cls[0]).toContain('bg-wind-calm') // great
    expect(cls[1]).toContain('bg-wind-moderate') // good
    expect(cls[2]).toContain('bg-wind-strong') // fair
    expect(cls[3]).toContain('bg-wind-extreme') // poor
  })

  it('translates', () => {
    setLocale('en')
    expect(mk().text()).toContain('Recommended activities')
    expect(mk().text()).toContain('Great')
    setLocale('pt')
  })
})
