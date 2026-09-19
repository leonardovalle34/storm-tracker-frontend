import { createI18n } from 'vue-i18n'
import en from './locales/en'
import es from './locales/es'
import pt from './locales/pt'

export type LocaleCode = 'pt' | 'en' | 'es'
export const LOCALES: { code: LocaleCode; label: string }[] = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
]

const KEY = 'st-locale'

function initial(): LocaleCode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'pt' || v === 'en' || v === 'es') return v
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'pt'
  return nav === 'en' || nav === 'es' ? nav : 'pt'
}

export const i18n = createI18n({
  legacy: false,
  locale: initial(),
  fallbackLocale: 'en',
  messages: { pt, en, es },
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
