import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createScrollSync } from './scrollSync'

/** jsdom does not lay out, so give elements a settable scrollLeft and count the writes. */
function scroller() {
  const el = document.createElement('div')
  let left = 0
  const writes = vi.fn()
  Object.defineProperty(el, 'scrollLeft', {
    get: () => left,
    set: (v: number) => {
      left = v
      writes(v)
    },
  })
  return { el, writes, scroll: (x: number) => ((left = x), el.dispatchEvent(new Event('scroll'))) }
}

describe('createScrollSync', () => {
  let sync: ReturnType<typeof createScrollSync>
  beforeEach(() => {
    sync = createScrollSync()
  })

  it('moves every registered scroller to the same DAY when one is scrolled (pitches differ)', () => {
    const [a, b, c] = [scroller(), scroller(), scroller()]
    sync.register(a.el, () => 100)
    sync.register(b.el, () => 50)
    sync.register(c.el, () => 200)
    a.scroll(300) // day 3
    expect(b.el.scrollLeft).toBe(150)
    expect(c.el.scrollLeft).toBe(600)
    c.scroll(400) // day 2, scrolled from another one
    expect(a.el.scrollLeft).toBe(200)
    expect(b.el.scrollLeft).toBe(100)
  })

  it('does not loop: the echo scroll events of programmatic moves are ignored', () => {
    const [a, b, c] = [scroller(), scroller(), scroller()]
    sync.register(a.el, () => 100)
    sync.register(b.el, () => 100)
    sync.register(c.el, () => 100)
    a.scroll(300)
    const before = [a.writes.mock.calls.length, b.writes.mock.calls.length, c.writes.mock.calls.length]
    // browsers fire scroll on b and c because we moved them: those must not propagate back
    b.el.dispatchEvent(new Event('scroll'))
    c.el.dispatchEvent(new Event('scroll'))
    expect([a.writes.mock.calls.length, b.writes.mock.calls.length, c.writes.mock.calls.length]).toEqual(
      before,
    )
    expect(a.el.scrollLeft).toBe(300)
  })

  it('a later genuine scroll on a scroller that was just synced still propagates', () => {
    const [a, b] = [scroller(), scroller()]
    sync.register(a.el, () => 100)
    sync.register(b.el, () => 100)
    a.scroll(300)
    b.el.dispatchEvent(new Event('scroll')) // echo, swallowed
    b.scroll(500) // the user now drags b
    expect(a.el.scrollLeft).toBe(500)
  })

  it('a scroller registered later adopts the current position', () => {
    const [a, b] = [scroller(), scroller()]
    sync.register(a.el, () => 100)
    a.scroll(300) // day 3
    sync.register(b.el, () => 40)
    expect(b.el.scrollLeft).toBe(120)
  })

  it('unregister stops the syncing for that scroller', () => {
    const [a, b] = [scroller(), scroller()]
    sync.register(a.el, () => 100)
    const off = sync.register(b.el, () => 100)
    off()
    a.scroll(300)
    expect(b.el.scrollLeft).toBe(0)
    b.scroll(200)
    expect(a.el.scrollLeft).toBe(300)
  })

  it('ignores scrollers whose pitch is unknown (0) instead of dividing by zero', () => {
    const [a, b] = [scroller(), scroller()]
    sync.register(a.el, () => 0)
    sync.register(b.el, () => 100)
    expect(() => a.scroll(50)).not.toThrow()
    expect(b.el.scrollLeft).toBe(0)
  })

  it('when disabled, scrolling one does not move the others', () => {
    const [a, b] = [scroller(), scroller()]
    sync.register(a.el, () => 100)
    sync.register(b.el, () => 100)
    sync.setEnabled(false)
    a.scroll(300)
    expect(b.el.scrollLeft).toBe(0)
    b.scroll(120) // and back, independently
    expect(a.el.scrollLeft).toBe(300)
  })

  it('re-enabling aligns everything to the scroller the user moved last', () => {
    const [a, b, c] = [scroller(), scroller(), scroller()]
    sync.register(a.el, () => 100)
    sync.register(b.el, () => 50)
    sync.register(c.el, () => 200)
    sync.setEnabled(false)
    a.scroll(300)
    b.scroll(100) // last one moved: day 2
    sync.setEnabled(true)
    expect(a.el.scrollLeft).toBe(200)
    expect(c.el.scrollLeft).toBe(400)
    expect(b.el.scrollLeft).toBe(100)
  })

  it('a scroller that mounts while sync is off keeps its own position', () => {
    const [a, b] = [scroller(), scroller()]
    sync.register(a.el, () => 100)
    a.scroll(300)
    sync.setEnabled(false)
    sync.register(b.el, () => 100)
    expect(b.el.scrollLeft).toBe(0)
  })
})
