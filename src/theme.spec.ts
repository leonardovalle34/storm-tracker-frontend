import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrast } from '@/test/helpers'

const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  expect(start, `block ${selector}`).toBeGreaterThan(-1)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)].map((m) => [m[1], m[2]]))
}

const light = block(':root')
const dark = block('.dark')
const levels = ['calm', 'moderate', 'strong', 'extreme']

describe('theme tokens', () => {
  it.each([
    ['light', light],
    ['dark', dark],
  ])('%s: base text pairs meet AA 4.5:1', (_n, t) => {
    expect(contrast(t.text, t.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t.text, t.bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(levels)('wind level %s meets AA in light and dark', (lvl) => {
    expect(contrast(light[`wind-${lvl}-fg`], light[`wind-${lvl}-bg`])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(dark[`wind-${lvl}-fg`], dark[`wind-${lvl}-bg`])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(levels)('wind level %s has a distinct pair for light and dark', (lvl) => {
    expect(dark[`wind-${lvl}-bg`]).not.toBe(light[`wind-${lvl}-bg`])
    expect(dark[`wind-${lvl}-fg`]).not.toBe(light[`wind-${lvl}-fg`])
  })

  it('dark wind cells are darker than light ones but not just a darkened copy (fg flips)', () => {
    for (const lvl of levels) {
      expect(contrast(light[`wind-${lvl}-fg`], '#000000')).toBeLessThan(
        contrast(dark[`wind-${lvl}-fg`], '#000000'),
      )
    }
  })

  it.each([
    ['light', light],
    ['dark', dark],
  ])('%s: ocean teal is readable (AA) on surface', (_n, t) => {
    expect(t.ocean).toBeDefined()
    expect(contrast(t.ocean, t.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('ocean teal differs between themes', () => {
    expect(dark.ocean).not.toBe(light.ocean)
  })

  it('brand color is fixed navy and not overridden by the dark theme', () => {
    expect(light.brand.toLowerCase()).toBe('#0b2338')
    expect(dark.brand).toBeUndefined()
  })
})
