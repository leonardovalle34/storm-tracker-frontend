import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FavoriteStar from './FavoriteStar.vue'

const mk = (active: boolean) => mount(FavoriteStar, { props: { active, label: 'Favorite' } })

describe('FavoriteStar', () => {
  it('is a toggle button labelled for screen readers', () => {
    const b = mk(false).get('button')
    expect(b.attributes('aria-pressed')).toBe('false')
    expect(b.attributes('aria-label')).toBe('Favorite')
  })

  it('shows a filled star when active and an outline when not', () => {
    expect(mk(true).get('svg').attributes('fill')).toBe('currentColor')
    expect(mk(false).get('svg').attributes('fill')).toBe('none')
    expect(mk(true).get('button').attributes('aria-pressed')).toBe('true')
  })

  it('emits toggle on click without letting the click reach the row behind it', async () => {
    const w = mk(false)
    let outer = false
    w.element.parentElement?.addEventListener('click', () => (outer = true))
    await w.get('button').trigger('click')
    expect(w.emitted('toggle')).toHaveLength(1)
    expect(outer).toBe(false)
  })
})
