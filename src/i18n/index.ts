import { createI18n } from 'vue-i18n'
import en from './locales/en'
import de from './locales/de'
import es from './locales/es'
import fr from './locales/fr'
import pt from './locales/pt'

export type LocaleCode = 'pt' | 'en' | 'es' | 'fr' | 'de'
export const LOCALES: { code: LocaleCode; label: string }[] = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
]

const KEY = 'st-locale'

function initial(): LocaleCode {
  try {
    const v = localStorage.getItem(KEY)
    if (LOCALES.some((l) => l.code === v)) return v as LocaleCode
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'pt'
  return LOCALES.find((l) => l.code === nav)?.code ?? 'pt'
}

export const i18n = createI18n({
  legacy: false,
  locale: initial(),
  fallbackLocale: 'en',
  messages: { pt, en, es, fr, de },
})

document.documentElement.lang = i18n.global.locale.value

export function setLocale(code: LocaleCode) {
  i18n.global.locale.value = code
  document.documentElement.lang = code
  try {
    localStorage.setItem(KEY, code)
  } catch {
    /* ignore */
  }
}
