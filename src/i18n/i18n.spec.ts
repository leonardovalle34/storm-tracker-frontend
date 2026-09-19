import { describe, expect, it, vi } from 'vitest'
import { i18n, LOCALES, setLocale } from './index'
import en from './locales/en'
import de from './locales/de'
import es from './locales/es'
import fr from './locales/fr'
import pt from './locales/pt'

const keys = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`],
  )

describe('i18n', () => {
  it('supports pt, en, es, fr and de', () => {
    expect(LOCALES.map((l) => l.code)).toEqual(['pt', 'en', 'es', 'fr', 'de'])
  })

  it('all locales have exactly the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(pt).sort())
    expect(keys(es).sort()).toEqual(keys(pt).sort())
    expect(keys(fr).sort()).toEqual(keys(pt).sort())
    expect(keys(de).sort()).toEqual(keys(pt).sort())
  })

  it('every locale keeps the same {placeholders} as English', () => {
    const flat = (o: Record<string, unknown>, p = ''): [string, string][] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null
          ? flat(v as Record<string, unknown>, `${p}${k}.`)
          : [[`${p}${k}`, String(v)]],
      )
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join()
    const base = new Map(flat(en))
    for (const messages of [pt, es, fr, de])
      for (const [key, text] of flat(messages)) expect(holes(text), key).toBe(holes(base.get(key)!))
  })

  it('French and German are translated (not English copies)', () => {
    expect(fr.header.language).toBe('Langue')
    expect(de.header.language).toBe('Sprache')
    expect(fr.moon['Full Moon']).toBe('Pleine lune')
    expect(de.moon['Full Moon']).toBe('Vollmond')
    setLocale('fr')
    expect(i18n.global.t('footer.madeBy')).toBe('Réalisé par')
    setLocale('de')
    expect(i18n.global.t('footer.madeBy')).toBe('Entwickelt von')
    expect(document.documentElement.lang).toBe('de')
    setLocale('pt')
  })

  it('picks the browser language on first visit when it is supported, else Portuguese', async () => {
    const lang = vi.spyOn(navigator, 'language', 'get')
    for (const [nav, expected] of [
      ['fr-CA', 'fr'],
      ['de-DE', 'de'],
      ['ja-JP', 'pt'],
    ] as const) {
      lang.mockReturnValue(nav)
      localStorage.clear()
      vi.resetModules()
      const fresh = await import('./index')
      expect(fresh.i18n.global.locale.value).toBe(expected)
    }
    lang.mockRestore()
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
