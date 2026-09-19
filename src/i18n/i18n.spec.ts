import { describe, expect, it } from 'vitest'
import { i18n, LOCALES, setLocale } from './index'
import en from './locales/en'
import es from './locales/es'
import pt from './locales/pt'

const keys = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`],
  )

describe('i18n', () => {
  it('supports pt, en and es', () => {
    expect(LOCALES.map((l) => l.code)).toEqual(['pt', 'en', 'es'])
  })

  it('all locales have exactly the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(pt).sort())
    expect(keys(es).sort()).toEqual(keys(pt).sort())
  })

  it('setLocale changes language, persists and sets <html lang>', () => {
    setLocale('en')
    expect(i18n.global.locale.value).toBe('en')
    expect(i18n.global.t('footer.madeBy')).toBe('Made by')
    expect(localStorage.getItem('st-locale')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    setLocale('es')
    expect(i18n.global.t('footer.madeBy')).toBe('Hecho por')
    setLocale('pt')
    expect(i18n.global.t('footer.madeBy')).toBe('Feito por')
  })
})
