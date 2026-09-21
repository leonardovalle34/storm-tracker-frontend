import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { i18n, setLocale } from '@/i18n'
import { useUnitsStore } from '@/stores/units'
import type { DayHour } from '@/utils/dayHours'
import { describeWeather } from '@/utils/weatherCode'
import HourlyTempChart from './HourlyTempChart.vue'

// 24 hourly values: a daily swing, 18 °C at 4h up to 30 °C at 16h
const temps = Array.from({ length: 24 }, (_, h) =>
  Math.round(24 + 6 * Math.cos(((h - 16) / 24) * 2 * Math.PI)),
)
const hoursOf = (values: (number | null)[] = temps, code = 0): DayHour[] =>
  values.map((temp, hour) => ({ hour, temp, weather: describeWeather(code) }))
const mk = (hours: DayHour[] = hoursOf()) =>
  mount(HourlyTempChart, { props: { hours }, global: { plugins: [i18n] } })

describe('HourlyTempChart', () => {
  setLocale('pt')

  it('draws a smooth curve (Bézier, no straight segments) with a gradient fill under it', () => {
    const w = mk()
    const line = w.get('[data-testid="temp-line"]')
    expect(line.attributes('d')).toContain('C')
    expect(line.attributes('d')).not.toContain('L')
    const gradId = w.get('linearGradient').attributes('id')!
    expect(w.get('[data-testid="temp-area"]').attributes('fill')).toBe(`url(#${gradId})`)
  })

  it('uses the warm token (orange/amber), not the ocean teal and never a fixed color', () => {
    const html = mk().html()
    expect(html).toContain('text-warm')
    expect(html).not.toMatch(/ocean/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/)
  })

  it('has a dot on the curve for every one of the 24 hours', () => {
    const w = mk()
    expect(w.findAll('[data-testid="temp-point"]')).toHaveLength(24)
  })

  it('shows the temperature of EVERY hour, not only peaks and valleys, below the curve', () => {
    const w = mk()
    const values = w.findAll('[data-testid="temp-value"]')
    expect(values).toHaveLength(24)
    expect(values.map((v) => v.text())).toEqual(temps.map((t) => `${t}°`))
    const lowestDot = Math.max(
      ...w.findAll('[data-testid="temp-point"]').map((c) => Number(c.attributes('cy'))),
    )
    for (const v of values) expect(Number(v.attributes('y'))).toBeGreaterThan(lowestDot)
  })

  it('shows a small weather icon above each hour, above the curve', () => {
    const hours = hoursOf().map((h) => (h.hour === 14 ? { ...h, weather: describeWeather(95) } : h))
    const w = mk(hours)
    const icons = w.findAll('[data-testid="temp-icon"]')
    expect(icons).toHaveLength(24)
    expect(icons[13].text()).toBe('☀️')
    expect(icons[14].text()).toBe('⛈️')
    expect(icons[14].attributes('aria-label')).toBe('Tempestade')
    const highestDot = Math.min(
      ...w.findAll('[data-testid="temp-point"]').map((c) => Number(c.attributes('cy'))),
    )
    for (const i of icons) expect(Number(i.attributes('y'))).toBeLessThan(highestDot)
  })

  it('repeats the same icon on every hour when all hours carry the daily code', () => {
    const w = mk(hoursOf(temps, 63))
    expect(new Set(w.findAll('[data-testid="temp-icon"]').map((i) => i.text()))).toEqual(new Set(['🌧️']))
  })

  it('has the hour axis 00h..23h, aligned with the points', () => {
    const w = mk()
    const axis = w.findAll('[data-testid="temp-hour"]')
    expect(axis.map((a) => a.text())).toEqual(
      Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`),
    )
    const dots = w.findAll('[data-testid="temp-point"]').map((c) => Number(c.attributes('cx')))
    expect(axis.map((a) => Number(a.attributes('x')))).toEqual(dots)
    expect(new Set(dots).size).toBe(24)
    expect(dots).toEqual([...dots].sort((a, b) => a - b)) // left to right by hour
  })

  it('puts the highest temperature on the highest point of the curve (lower cy)', () => {
    const w = mk()
    const cy = w.findAll('[data-testid="temp-point"]').map((c) => Number(c.attributes('cy')))
    expect(cy.indexOf(Math.min(...cy))).toBe(temps.indexOf(Math.max(...temps)))
    expect(cy.indexOf(Math.max(...cy))).toBe(temps.indexOf(Math.min(...temps)))
  })

  it('follows the temperature unit preference (values converted, axis and shape unchanged)', async () => {
    const w = mk(
      hoursOf(Array.from({ length: 24 }, () => 28)).map((h, i) => (i === 0 ? { ...h, temp: 0 } : h)),
    )
    const cyC = w.findAll('[data-testid="temp-point"]').map((c) => c.attributes('cy'))
    useUnitsStore().setTemperature('F')
    await w.vm.$nextTick()
    const values = w.findAll('[data-testid="temp-value"]').map((v) => v.text())
    expect(values[0]).toBe('32°') // 0 C
    expect(values[1]).toBe('82°') // 28 C
    expect(w.findAll('[data-testid="temp-point"]').map((c) => c.attributes('cy'))).toEqual(cyC)
  })

  it('shows a dash for a missing hour, without a dot, and the curve still goes through the others', () => {
    const values: (number | null)[] = [...temps]
    values[10] = null
    const w = mk(hoursOf(values))
    expect(w.findAll('[data-testid="temp-point"]')).toHaveLength(23)
    expect(w.findAll('[data-testid="temp-value"]')[10].text()).toBe('–')
    expect(w.get('[data-testid="temp-line"]').attributes('d')).toContain('C')
    expect(w.findAll('[data-testid="temp-hour"]')).toHaveLength(24)
  })

  it('renders nothing without enough data', () => {
    expect(
      mk(hoursOf(Array.from({ length: 24 }, () => null)))
        .find('svg')
        .exists(),
    ).toBe(false)
    expect(
      mk(hoursOf(Array.from({ length: 24 }, (_, h) => (h === 3 ? 20 : null))))
        .find('svg')
        .exists(),
    ).toBe(false)
    expect(mk([]).find('svg').exists()).toBe(false)
  })

  it('does not blow up on a flat day (all hours equal)', () => {
    const w = mk(hoursOf(Array.from({ length: 24 }, () => 25)))
    const cy = w.findAll('[data-testid="temp-point"]').map((c) => Number(c.attributes('cy')))
    expect(cy.every((y) => Number.isFinite(y))).toBe(true)
  })

  it('is responsive and accessible: scales with the container, role img with a translated label', () => {
    const svg = mk().get('svg')
    expect(svg.attributes('width')).toBeUndefined()
    expect(svg.classes()).toContain('w-full')
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toBe('Curva de temperatura por hora')
    setLocale('en')
    expect(mk().get('svg').attributes('aria-label')).toBe('Hourly temperature curve')
    setLocale('pt')
  })

  it('gives each instance its own gradient id', () => {
    const Two = defineComponent({
      components: { HourlyTempChart },
      setup: () => ({ hours: hoursOf() }),
      template: '<div><HourlyTempChart :hours="hours" /><HourlyTempChart :hours="hours" /></div>',
    })
    const ids = mount(Two, { global: { plugins: [i18n] } })
      .findAll('linearGradient')
      .map((g) => g.attributes('id'))
    expect(new Set(ids).size).toBe(2)
  })
})
