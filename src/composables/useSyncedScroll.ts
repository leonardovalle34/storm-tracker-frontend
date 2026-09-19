import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { useScrollSyncStore } from '@/stores/scrollSync'
import { scrollSync } from '@/utils/scrollSync'

/** Joins the shared group while the component is mounted. `pitch` = pixels per day for this scroller. */
export function useSyncedScroll(el: Ref<HTMLElement | null | undefined>, pitch: () => number) {
  useScrollSyncStore().init() // applies the stored on/off preference to the shared group
  let off: (() => void) | undefined
  onMounted(() => {
    if (el.value) off = scrollSync.register(el.value, pitch)
  })
  onBeforeUnmount(() => off?.())
}
