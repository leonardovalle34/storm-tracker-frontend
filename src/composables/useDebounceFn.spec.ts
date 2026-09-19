import { effectScope } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebounceFn } from './useDebounceFn'

describe('useDebounceFn', () => {
  beforeEach(() => vi.useFakeTimers())

  it('runs once, with the last arguments, after the quiet period', () => {
    const fn = vi.fn()
    const d = effectScope().run(() => useDebounceFn(fn, 500))!
    d('a')
    vi.advanceTimersByTime(400)
    d('b')
    vi.advanceTimersByTime(499)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('cancel drops the pending call', () => {
    const fn = vi.fn()
    const d = effectScope().run(() => useDebounceFn(fn, 500))!
    d()
    d.cancel()
    vi.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('cancels when its scope stops', () => {
    const fn = vi.fn()
    const scope = effectScope()
    const d = scope.run(() => useDebounceFn(fn, 500))!
    d()
    scope.stop()
    vi.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
  })
})
