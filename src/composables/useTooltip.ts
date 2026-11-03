import { onBeforeUnmount, ref } from 'vue'

export const TIP_WIDTH = 224 // px, w-56

/**
 * State and placement of a tooltip anchored to an element. The bubble is `position: fixed` next to the
 * anchor, so the horizontal scrollers (cards, chart) never clip it. Opens on hover / focus / tap (the
 * caller wires those); closes on Esc, a tap elsewhere or any scroll.
 */
export function useTooltip() {
  const open = ref(false)
  const style = ref<Record<string, string>>({})
  let anchor: Element | null = null

  function place() {
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const vw = window.innerWidth || TIP_WIDTH + 16
    const width = Math.min(TIP_WIDTH, vw - 16)
    const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, vw - width - 8))
    style.value = { left: `${left}px`, top: `${r.bottom + 6}px`, width: `${width}px` }
  }
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide()
  const onOutside = (e: Event) => {
    if (!(e.target instanceof Node) || !anchor?.contains(e.target)) hide()
  }
  function listen(on: boolean) {
    const m = on ? 'addEventListener' : 'removeEventListener'
    document[m]('keydown', onKey as EventListener)
    document[m]('pointerdown', onOutside)
    window[m]('scroll', hide, true)
  }

  function show(el: Element) {
    anchor = el
    place()
    if (!open.value) listen(true)
    open.value = true
  }
  function hide() {
    if (open.value) listen(false)
    open.value = false
  }
  /** a tap toggles (there is no hover on touch screens) */
  function toggle(el: Element) {
    if (open.value && anchor === el) hide()
    else show(el)
  }
  onBeforeUnmount(hide)
  return { open, style, show, hide, toggle }
}
