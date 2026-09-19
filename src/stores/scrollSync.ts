import { defineStore } from 'pinia'
import { scrollSync } from '@/utils/scrollSync'

const KEY = 'st-scroll-sync'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

/** User preference (default on), persisted and shared by every toggle on the page. */
export const useScrollSyncStore = defineStore('scrollSync', {
  state: () => ({
    enabled: read(),
  }),

  actions: {
    /** Applies the stored preference to the shared scroll group. */
    init() {
      scrollSync.setEnabled(this.enabled)
    },

    toggle() {
      this.enabled = !this.enabled
      try {
        localStorage.setItem(KEY, this.enabled ? 'on' : 'off')
      } catch {
        /* ignore */
      }
      this.init()
    },
  },
})
