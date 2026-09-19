import { onScopeDispose } from 'vue'

/** Delays `fn` until `ms` after the last call; `cancel()` drops a pending call. Cleans up with its scope. */
export function useDebounceFn<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => clearTimeout(timer)
  const debounced = (...args: A) => {
    cancel()
    timer = setTimeout(() => fn(...args), ms)
  }
  onScopeDispose(cancel)
  return Object.assign(debounced, { cancel })
}
