import { afterEach, vi } from 'vitest'

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

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})
