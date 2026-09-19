import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import ModelMaps from './ModelMaps.vue'

const location = { name: 'Santos', latitude: -23.96, longitude: -46.33 }
const mk = (coastal: boolean, attach = false) =>
  mount(ModelMaps, { props: { location, coastal }, global: { plugins: [i18n] }, attachTo: attach ? document.body : undefined })

const overlays = (w: ReturnType<typeof mk>) =>
  w.findAll('[data-testid="model-frame"]').map((f) => new URL(f.attributes('src')!).searchParams.get('overlay'))

describe('ModelMaps', () => {
  setLocale('pt')

  it('always shows rain, snow and temp', () => {
    expect(overlays(mk(false))).toEqual(['rain', 'snow', 'temp'])
  })

  it('adds waves and sst only for coastal locations', () => {
    expect(overlays(mk(true))).toEqual(['rain', 'snow', 'temp', 'waves', 'sst'])
  })

  it('embeds Windy embed2.html', () => {
    const src = mk(false).get('[data-testid="model-frame"]').attributes('src')!
    expect(src).toContain('https://embed.windy.com/embed2.html')
  })

  it('opens a native <dialog> with the expanded map (menu visible, more zoom) on click', async () => {
    const w = mk(false, true)
    const dialog = w.get('dialog')
    expect(dialog.attributes('open')).toBeUndefined()
    expect(w.find('[data-testid="modal-frame"]').exists()).toBe(false)

    await w.findAll('[data-testid="model-open"]')[1].trigger('click')
    expect(dialog.attributes('open')).toBeDefined()
    const src = new URL(w.get('[data-testid="modal-frame"]').attributes('src')!)
    expect(src.searchParams.get('overlay')).toBe('snow')
    expect(src.searchParams.get('menu')).toBe('true')
    expect(Number(src.searchParams.get('zoom'))).toBeGreaterThan(5)
    w.unmount()
  })

  it('closes with the close button and by clicking the backdrop', async () => {
    const w = mk(false, true)
    const dialog = w.get('dialog')
    await w.findAll('[data-testid="model-open"]')[0].trigger('click')
    await w.get('[data-testid="modal-close"]').trigger('click')
    expect(dialog.attributes('open')).toBeUndefined()
    expect(w.find('[data-testid="modal-frame"]').exists()).toBe(false)

    await w.findAll('[data-testid="model-open"]')[0].trigger('click')
    await dialog.trigger('click') // target === dialog => backdrop
    expect(dialog.attributes('open')).toBeUndefined()
    w.unmount()
  })
})
