import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom does not implement <dialog> modal methods.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

const initial = createPinia()
setActivePinia(initial)
config.global.plugins = [initial] // for components mounted while collecting tests

// Fresh Pinia per test: every mounted component and every direct store call shares it.
beforeEach(() => {
  const pinia = createPinia()
  setActivePinia(pinia)
  config.global.plugins = [pinia]
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})
