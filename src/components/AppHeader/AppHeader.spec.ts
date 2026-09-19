import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import AppHeader from './AppHeader.vue'

describe('AppHeader', () => {
  const w = mount(AppHeader, { global: { plugins: [i18n] } })

  it('uses the round logo (no text logo) on the left', () => {
    const img = w.get('img')
    expect(img.attributes('src')).toContain('round-logo')
    expect(img.attributes('alt')).toBeTruthy()
    expect(w.html()).not.toContain('full-logo')
  })

  it('has fixed navy brand background, not theme-dependent', () => {
    const cls = w.get('header').classes()
    expect(cls).toContain('bg-brand')
    expect(cls.some((c) => c.startsWith('dark:bg'))).toBe(false)
  })

  it('contains search, language selector and theme toggle', () => {
    expect(w.find('input[role="combobox"]').exists()).toBe(true)
    expect(w.find('select').exists()).toBe(true)
    expect(w.find('button[role="switch"]').exists()).toBe(true)
  })
})
