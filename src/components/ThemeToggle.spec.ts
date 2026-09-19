import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { _resetTheme } from '@/composables/useTheme'
import { i18n } from '@/i18n'
import ThemeToggle from './ThemeToggle.vue'

describe('ThemeToggle', () => {
  beforeEach(() => _resetTheme())
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
})
