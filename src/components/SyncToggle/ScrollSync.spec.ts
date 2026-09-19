import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import * as weatherService from '@/services/weatherService'
import { i18n } from '@/i18n'
import { makeForecast, makeMarine } from '@/test/fixtures'
import ForecastCards from '@/components/ForecastCards/ForecastCards.vue'
import OceanGrid from '@/components/OceanGrid/OceanGrid.vue'
import WindGrid from '@/components/WindGrid/WindGrid.vue'

vi.mock('@/services/weatherService', () => ({
  getMoonPhase: vi.fn().mockResolvedValue({ date: 'x', phase_index: 1, phase_name: 'Full Moon' }),
}))

function stubScroll(el: Element) {
  let left = 0
  Object.defineProperty(el, 'scrollLeft', { get: () => left, set: (v: number) => (left = v) })
  return (x: number) => ((left = x), el.dispatchEvent(new Event('scroll')))
}

describe('forecast cards, wind and ocean scroll together', () => {
  beforeEach(() => vi.mocked(weatherService.getMoonPhase).mockClear())

  it('scrolling any of the three moves the other two to the same day', async () => {
    const days = ['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']
    const f = makeForecast(days)
    const Page = defineComponent({
      setup: () => () =>
        h('div', [
          h(ForecastCards, { daily: f.daily }),
          h(WindGrid, { hourly: f.hourly }),
          h(OceanGrid, { hourly: makeMarine(true, days).hourly, forecast: f }),
        ]),
    })
    const w = mount(Page, { global: { plugins: [i18n] }, attachTo: document.body })
    await flushPromises()
    const cards = w.get('[data-testid="day-cards"]').element
    const wind = w.get('[data-testid="wind-scroll"]').element
    const ocean = w.get('[data-testid="ocean-scroll"]').element
    const scrollCards = stubScroll(cards)
    const scrollWind = stubScroll(wind)
    stubScroll(ocean)

    // jsdom has no layout: cards fall back to a 124px day pitch, tables are 7 cols x 2.5rem = 280px
    scrollCards(248) // day 2
    expect(wind.scrollLeft).toBe(560)
    expect(ocean.scrollLeft).toBe(560)

    scrollWind(280) // day 1, from the wind grid
    expect(cards.scrollLeft).toBe(124)
    expect(ocean.scrollLeft).toBe(280)
    w.unmount()
  })
})
