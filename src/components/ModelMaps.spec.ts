import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import ModelMaps from './ModelMaps.vue'

const location = { name: 'Santos', latitude: -23.96, longitude: -46.33 }
const mk = (coastal: boolean, attach = false) =>
  mount(ModelMaps, {
    props: { location, coastal },
    global: { plugins: [i18n] },
    attachTo: attach ? document.body : undefined,
  })

const overlays = (w: ReturnType<typeof mk>) =>
  w
    .findAll('[data-testid="model-frame"]')
    .map((f) => new URL(f.attributes('src')!).searchParams.get('overlay'))

describe('ModelMaps', () => {
  setLocale('pt')

  it('always shows precipitation (rain overlay), wind and temperature, in that order', () => {
    expect(overlays(mk(false))).toEqual(['rain', 'wind', 'temp'])
  })

  it('has one combined "Precipitação" tile and no separate rain/snow tiles', () => {
    const titles = mk(false)
      .findAll('figcaption')
      .map((f) => f.text())
    expect(titles).toEqual(['Precipitação', 'Vento', 'Temperatura'])
    expect(titles).not.toContain('Chuva')
    expect(titles).not.toContain('Neve')
  })

  it('adds waves and sst only for coastal locations', () => {
    expect(overlays(mk(true))).toEqual(['rain', 'wind', 'temp', 'waves', 'sst'])
  })

  it('centers incomplete last rows (e.g. the two coastal tiles under three)', () => {
    const grid = mk(true).get('[data-testid="model-grid"]')
    expect(grid.classes()).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'justify-center']))
    const tiles = mk(true).findAll('figure')
    expect(tiles).toHaveLength(5)
    // fixed column widths (not grid tracks), so a short last row is centered instead of left-aligned
    expect(tiles.every((t) => t.classes().some((c) => c.startsWith('lg:w-[calc(33.333%')))).toBe(true)
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
    expect(src.searchParams.get('overlay')).toBe('wind')
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
