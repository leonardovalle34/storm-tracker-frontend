import { defineStore } from 'pinia'
import { i18n, LOCALES, setLocale, type LocaleCode } from '@/i18n'

/** vue-i18n stays the source of truth for the active locale, so there is no state to keep in sync here. */
export const useLanguageStore = defineStore('language', {
  getters: {
    locale: (): LocaleCode => i18n.global.locale.value as LocaleCode,
    locales: () => LOCALES,
  },

  actions: {
    setLocale(code: LocaleCode) {
      setLocale(code)
    },
  },
})
