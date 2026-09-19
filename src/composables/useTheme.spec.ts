import { beforeEach, describe, expect, it } from 'vitest'
import { _resetTheme, useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => _resetTheme())

  it('defaults to light and does not add the dark class', () => {
    const { theme } = useTheme()
    expect(theme.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle switches theme, updates the html class and persists', () => {
    const { theme, toggle } = useTheme()
    toggle()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('st-theme')).toBe('dark')
    toggle()
    expect(theme.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('restores the stored preference', () => {
    localStorage.setItem('st-theme', 'dark')
    _resetTheme()
    expect(useTheme().theme.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
