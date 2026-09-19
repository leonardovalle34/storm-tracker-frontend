import { ref } from 'vue'

export type Theme = 'light' | 'dark'
const KEY = 'st-theme'

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light') return v
  } catch { /* storage unavailable */ }
  return 'light'
}

const theme = ref<Theme>(read())

function apply(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark')
  try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
}

export function _resetTheme() {
  theme.value = read()
  document.documentElement.classList.toggle('dark', theme.value === 'dark')
}

export function useTheme() {
  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    apply(theme.value)
  }
  return { theme, toggle }
}
