import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import AppFooter from './AppFooter.vue'

describe('AppFooter', () => {
  setLocale('pt')
  const w = mount(AppFooter, { global: { plugins: [i18n] } })

  it('shows the full logo on the left', () => {
    const img = w.get('img')
    expect(img.attributes('src')).toContain('full-logo')
    expect(img.attributes('alt')).toBeTruthy()
  })

  it('credits Nexus Tecnologia with a safe external link', () => {
    expect(w.text()).toContain('Feito por Nexus Tecnologia')
    const a = w.get('a')
    expect(a.attributes('href')).toBe('https://nexustecnologia.online')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toContain('noopener')
  })
})
