import { describe, expect, it } from 'vitest'
import { useThemeStore } from './theme'

describe('theme store', () => {
  it('defaults to light and does not add the dark class', () => {
    const s = useThemeStore()
    s.init()
    expect(s.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle switches theme, updates the html class and persists', () => {
    const s = useThemeStore()
    s.toggle()
    expect(s.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('st-theme')).toBe('dark')
    s.toggle()
    expect(s.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('init restores the stored preference', () => {
    localStorage.setItem('st-theme', 'dark')
    const s = useThemeStore()
    s.init()
    expect(s.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
