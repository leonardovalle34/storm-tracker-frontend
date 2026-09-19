import { describe, expect, it, vi } from 'vitest'
import { scrollSync } from '@/utils/scrollSync'
import { useScrollSyncStore } from './scrollSync'

describe('scroll sync store', () => {
  it('is on by default', () => {
    expect(useScrollSyncStore().enabled).toBe(true)
  })

  it('toggle flips it, persists it and drives the shared scroll group', () => {
    const spy = vi.spyOn(scrollSync, 'setEnabled')
    const s = useScrollSyncStore()
    s.toggle()
    expect(s.enabled).toBe(false)
    expect(localStorage.getItem('st-scroll-sync')).toBe('off')
    expect(spy).toHaveBeenLastCalledWith(false)
    s.toggle()
    expect(s.enabled).toBe(true)
    expect(spy).toHaveBeenLastCalledWith(true)
    spy.mockRestore()
  })

  it('restores the stored preference', () => {
    localStorage.setItem('st-scroll-sync', 'off')
    expect(useScrollSyncStore().enabled).toBe(false)
  })
})
