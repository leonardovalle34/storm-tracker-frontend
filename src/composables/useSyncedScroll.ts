import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/**
 * Keeps horizontal scrollers in step. Their content widths differ (a forecast card is ~124px per day,
 * a table day is 7 hour columns wide), so positions are shared in DAYS, not pixels: each scroller
 * reports its pixels-per-day and every other one is moved to the same day offset.
 */
export function createScrollSync() {
  const entries = new Map<HTMLElement, () => number>()
  // value we just wrote to each element, to recognise (and swallow) the scroll event that write causes
  const expected = new Map<HTMLElement, number>()
  let day = 0

  function apply(el: HTMLElement, x: number) {
    if (Math.abs(el.scrollLeft - x) < 0.5) return
    el.scrollLeft = x
    expected.set(el, el.scrollLeft)
  }

  function onScroll(el: HTMLElement) {
    const echo = expected.get(el)
    if (echo !== undefined) {
      expected.delete(el)
      if (Math.abs(el.scrollLeft - echo) < 1) return // caused by us, not by the user
    }
    const pitch = entries.get(el)?.() ?? 0
    if (!(pitch > 0)) return
    day = el.scrollLeft / pitch
    for (const [other, otherPitch] of entries) {
      const p = other === el ? 0 : otherPitch()
      if (p > 0) apply(other, day * p)
    }
  }

  function register(el: HTMLElement, pitch: () => number): () => void {
    const handler = () => onScroll(el)
    entries.set(el, pitch)
    el.addEventListener('scroll', handler, { passive: true })
    const p = pitch()
    if (p > 0) apply(el, day * p) // join the group at the current position
    return () => {
      entries.delete(el)
      expected.delete(el)
      el.removeEventListener('scroll', handler)
    }
  }

  return { register }
}

/** One shared group for every forecast/wind/ocean scroller on the page. */
export const scrollSync = createScrollSync()

/** Joins the shared group while the component is mounted. `pitch` = pixels per day for this scroller. */
export function useSyncedScroll(el: Ref<HTMLElement | null | undefined>, pitch: () => number) {
  let off: (() => void) | undefined
  onMounted(() => {
    if (el.value) off = scrollSync.register(el.value, pitch)
  })
  onBeforeUnmount(() => off?.())
}
