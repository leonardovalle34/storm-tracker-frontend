import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'
const KEY = 'st-theme'

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light') return v
  } catch {
    /* storage unavailable */
  }
  return 'light'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: read() as Theme,
  }),

  actions: {
    applyClass() {
      document.documentElement.classList.toggle('dark', this.theme === 'dark')
    },

    /** Applies the stored theme to <html>; call once before first paint. */
    init() {
      this.theme = read()
      this.applyClass()
    },

    toggle() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      this.applyClass()
      try {
        localStorage.setItem(KEY, this.theme)
      } catch {
        /* ignore */
      }
    },
  },
})
