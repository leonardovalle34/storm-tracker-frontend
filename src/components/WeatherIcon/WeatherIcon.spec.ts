import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import WeatherIcon from './WeatherIcon.vue'

const mk = (props: Record<string, unknown> = {}) =>
  mount(WeatherIcon, {
    props: { icon: '⛅', label: 'Parcialmente nublado', tip: ['Linha 1', 'Linha 2'], ...props },
    attachTo: document.body,
  })
let w: ReturnType<typeof mk>
afterEach(() => w?.unmount())

const tipOf = (x: ReturnType<typeof mk>) => x.get('[data-testid="weather-icon-tip"]')
const isOpen = (x: ReturnType<typeof mk>) => tipOf(x).attributes('data-open') === 'true'

describe('WeatherIcon', () => {
  it('is an image named by the condition and described by its tooltip', () => {
    w = mk()
    const icon = w.get('[data-testid="weather-icon"]')
    expect(icon.attributes('role')).toBe('img')
    expect(icon.attributes('aria-label')).toBe('Parcialmente nublado')
    const tip = w.get(`#${icon.attributes('aria-describedby')}`)
    expect(tip.attributes('role')).toBe('tooltip')
    expect(tip.text()).toContain('Linha 1')
    expect(tip.text()).toContain('Linha 2')
    expect(icon.text()).toBe('⛅') // the tooltip is not inside the icon
  })

  it('opens on hover and closes on leave', async () => {
    w = mk()
    expect(isOpen(w)).toBe(false)
    await w.get('[data-testid="weather-icon"]').trigger('mouseenter')
    expect(isOpen(w)).toBe(true)
    await w.get('[data-testid="weather-icon"]').trigger('mouseleave')
    expect(isOpen(w)).toBe(false)
  })

  it('opens on keyboard focus when focusable, closes on blur and on Esc', async () => {
    w = mk({ focusable: true })
    const icon = w.get('[data-testid="weather-icon"]')
    expect(icon.attributes('tabindex')).toBe('0')
    await icon.trigger('focus')
    expect(isOpen(w)).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(isOpen(w)).toBe(false)
    await icon.trigger('focus')
    await icon.trigger('blur')
    expect(isOpen(w)).toBe(false)
  })

  it('is not a tab stop by default (inside a button), and opens from `active`', async () => {
    w = mk()
    expect(w.get('[data-testid="weather-icon"]').attributes('tabindex')).toBeUndefined()
    await w.setProps({ active: true })
    expect(isOpen(w)).toBe(true)
    await w.setProps({ active: false })
    expect(isOpen(w)).toBe(false)
  })

  it('a tap toggles it and does not reach the parent (the card would open the modal)', async () => {
    let parentClicks = 0
    w = mk()
    w.element.parentElement!.addEventListener('click', () => parentClicks++)
    const icon = w.get('[data-testid="weather-icon"]')
    await icon.trigger('pointerdown', { pointerType: 'touch' })
    await icon.trigger('click')
    expect(isOpen(w)).toBe(true)
    expect(parentClicks).toBe(0)
    await icon.trigger('pointerdown', { pointerType: 'touch' })
    await icon.trigger('click')
    expect(isOpen(w)).toBe(false)
    // a mouse click is left alone
    await icon.trigger('pointerdown', { pointerType: 'mouse' })
    await icon.trigger('click')
    expect(parentClicks).toBe(1)
  })

  it('a tap elsewhere closes it', async () => {
    w = mk()
    await w.get('[data-testid="weather-icon"]').trigger('mouseenter')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await w.vm.$nextTick()
    expect(isOpen(w)).toBe(false)
  })

  it('shows a small drop for isolated rain and a bolt for isolated thunder', () => {
    w = mk()
    expect(w.find('[data-testid="weather-badge"]').exists()).toBe(false)
    const rain = mk({ isolated: 'rain' })
    expect(rain.get('[data-testid="weather-badge"]').text()).toBe('💧')
    expect(rain.get('[data-testid="weather-badge"]').attributes('aria-hidden')).toBe('true')
    expect(mk({ isolated: 'thunder' }).get('[data-testid="weather-badge"]').text()).toBe('⚡')
  })
})
