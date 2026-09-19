import { onScopeDispose, ref, watch, type Ref } from 'vue'
import { geocode } from '@/services/api'
import type { Location } from '@/types/weather'

// Public Nominatim allows 1 req/s: debounce + minimum length keep us well under it.
export const DEBOUNCE_MS = 500
export const MIN_CHARS = 3

export function useLocationSearch(query: Ref<string>) {
  const results = ref<Location[]>([])
  const loading = ref(false)
  const searched = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let token = 0
  let skip = false

  const reset = () => {
    results.value = []
    loading.value = false
    searched.value = false
  }

  watch(query, (value) => {
    clearTimeout(timer)
    const current = ++token
    if (skip) {
      skip = false
      return
    }
    const q = value.trim()
    if (q.length < MIN_CHARS) return reset()
    searched.value = false
    timer = setTimeout(async () => {
      loading.value = true
      try {
        const found = await geocode(q)
        if (current !== token) return
        results.value = found
        searched.value = true
      } catch {
        if (current === token) reset()
      } finally {
        if (current === token) loading.value = false
      }
    }, DEBOUNCE_MS)
  })

  onScopeDispose(() => clearTimeout(timer))

  const skipNext = () => {
    skip = true
  }
  const clear = () => {
    token++
    clearTimeout(timer)
    reset()
  }

  return { results, loading, searched, skipNext, clear }
}
