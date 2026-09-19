import { afterEach, describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { useLanguageStore } from './language'

describe('language store', () => {
  afterEach(() => setLocale('pt'))

  it('exposes the active locale and the available ones', () => {
    setLocale('pt')
    const s = useLanguageStore()
    expect(s.locale).toBe('pt')
    expect(s.locales.map((l) => l.code)).toEqual(['pt', 'en', 'es', 'fr', 'de'])
  })

  it('setLocale switches vue-i18n, the html lang and persists', () => {
    const s = useLanguageStore()
    s.setLocale('es')
    expect(s.locale).toBe('es')
    expect(i18n.global.locale.value).toBe('es')
    expect(document.documentElement.lang).toBe('es')
    expect(localStorage.getItem('st-locale')).toBe('es')
  })
})
