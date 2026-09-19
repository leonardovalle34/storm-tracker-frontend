import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import SyncToggle from './SyncToggle.vue'

const mk = () => mount(SyncToggle, { global: { plugins: [i18n] } })

describe('SyncToggle', () => {
  beforeEach(() => {
    setLocale('pt')
  })

  it('is a labelled switch, on by default, that flips on click', async () => {
    const w = mk()
    const sw = w.get('button[role="switch"]')
    expect(w.text()).toContain('Sincronizar rolagem')
    expect(sw.attributes('aria-checked')).toBe('true')
    await sw.trigger('click')
    expect(sw.attributes('aria-checked')).toBe('false')
    await sw.trigger('click')
    expect(sw.attributes('aria-checked')).toBe('true')
  })

  it('shares one state between every instance on the page', async () => {
    const [a, b] = [mk(), mk()]
    await a.get('button[role="switch"]').trigger('click')
    expect(b.get('button[role="switch"]').attributes('aria-checked')).toBe('false')
  })

  it('has an explanatory tooltip, wired for hover, keyboard focus and screen readers', () => {
    const w = mk()
    const tip = w.get('[role="tooltip"]')
    expect(tip.text()).toContain('move os três quadros juntos')
    expect(tip.text()).toContain('independente')
    expect(w.get('button[role="switch"]').attributes('aria-describedby')).toBe(tip.attributes('id'))
    // CSS-only reveal on hover or keyboard focus
    expect(tip.classes()).toEqual(
      expect.arrayContaining(['invisible', 'group-hover:visible', 'group-focus-within:visible']),
    )
  })

  it('translates', () => {
    setLocale('en')
    const w = mk()
    expect(w.text()).toContain('Sync scrolling')
    setLocale('es')
    expect(mk().text()).toContain('Sincronizar desplazamiento')
    setLocale('pt')
  })
})
