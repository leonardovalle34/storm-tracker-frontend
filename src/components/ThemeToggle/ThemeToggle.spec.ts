import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useThemeStore } from '@/stores/theme'
import { i18n, setLocale } from '@/i18n'
import ThemeToggle from './ThemeToggle.vue'

describe('ThemeToggle', () => {
  beforeEach(() => useThemeStore().init())
  const mk = () => mount(ThemeToggle, { global: { plugins: [i18n] } })

  it('is a switch reflecting the theme', async () => {
    const w = mk()
    const btn = w.get('button')
    expect(btn.attributes('role')).toBe('switch')
    expect(btn.attributes('aria-checked')).toBe('false')
    await btn.trigger('click')
    expect(btn.attributes('aria-checked')).toBe('true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('uses a switch icon, never sun/moon', () => {
    const w = mk()
    expect(w.find('[data-testid="switch-icon"]').exists()).toBe(true)
    expect(w.html()).not.toMatch(/sun|moon|☀|🌙|☾/i)
  })

  it('has an accessible label', () => {
    expect(mk().get('button').attributes('aria-label')).toBeTruthy()
  })

  it('shows which theme is active next to the switch, and updates it', async () => {
    setLocale('pt')
    const w = mk()
    expect(w.get('[data-testid="theme-label"]').text()).toBe('Claro')
    await w.get('button').trigger('click')
    expect(w.get('[data-testid="theme-label"]').text()).toBe('Escuro')
    setLocale('en')
    await w.vm.$nextTick()
    expect(w.get('[data-testid="theme-label"]').text()).toBe('Dark')
    setLocale('pt')
  })

  it('has an explanatory tooltip (hover/focus) that states the current theme', async () => {
    setLocale('pt')
    const w = mk()
    const tip = w.get('[role="tooltip"]')
    expect(tip.text()).toContain('claro e o escuro')
    expect(tip.text()).toContain('Agora: claro')
    expect(w.get('button').attributes('aria-describedby')).toBe(tip.attributes('id'))
    expect(tip.classes()).toEqual(
      expect.arrayContaining(['invisible', 'group-hover:visible', 'group-focus-within:visible']),
    )
    await w.get('button').trigger('click')
    expect(tip.text()).toContain('Agora: escuro')
  })

  it('keeps the no-sun/moon rule for label and tooltip too', async () => {
    for (const l of ['pt', 'en', 'es', 'fr', 'de'] as const) {
      setLocale(l)
      const w = mk()
      expect(w.html()).not.toMatch(/sun|moon|sol\b|lua\b|☀|🌙|☾/i)
      await w.get('button').trigger('click')
      expect(w.html()).not.toMatch(/sun|moon|sol\b|lua\b|☀|🌙|☾/i)
      await w.get('button').trigger('click')
    }
    setLocale('pt')
  })
})
