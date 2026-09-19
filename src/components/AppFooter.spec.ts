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

  it('uses the same fixed navy brand background as the header, in both themes', () => {
    const footer = w.get('footer')
    expect(footer.classes()).toContain('bg-brand')
    expect(footer.classes()).toContain('text-brand-fg')
    expect(footer.classes().some((c) => c.startsWith('dark:'))).toBe(false)
  })

  it('uses no theme-dependent color tokens anywhere inside the footer', () => {
    const themed =
      /(^|\s)(dark:\S+|(bg|text|border|ring|fill|stroke)-(surface|surface-2|page|ink|muted|line|line-strong|accent|accent-fg)\b)/
    const els = [w.get('footer').element, ...w.get('footer').element.querySelectorAll('*')]
    for (const el of els) expect(el.getAttribute('class') ?? '', el.tagName).not.toMatch(themed)
  })

  it('shows the brand large, straight on the navy: no white box around the logo', () => {
    const img = w.get('img')
    expect(img.attributes('src')).toContain('full-logo-light') // lettering recolored for dark backgrounds
    expect(img.classes()).toContain('h-24') // ~96px tall (was 40px)
    const box = img.element.parentElement!
    expect(box.classList.contains('bg-white')).toBe(false)
    expect(img.element.className).not.toMatch(/bg-white/)
  })

  it('the credit link stays legible on navy (light text, underlined)', () => {
    const a = w.get('a')
    expect(a.classes()).toContain('text-brand-fg')
    expect(a.classes()).toContain('underline')
  })
})
