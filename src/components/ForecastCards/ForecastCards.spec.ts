import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { useUnitsStore } from '@/stores/units'
import { makeForecast, makeMarine } from '@/test/fixtures'
import ForecastCards from './ForecastCards.vue'

describe('ForecastCards', () => {
  setLocale('pt')
  const daily = makeForecast(['2026-09-19', '2026-09-20', '2026-09-21']).daily
  const w = mount(ForecastCards, { props: { daily }, global: { plugins: [i18n] } })

  it('renders one card per day in a horizontally scrollable row', () => {
    expect(w.findAll('[data-testid="day-card"]')).toHaveLength(3)
    expect(w.get('[data-testid="day-cards"]').classes()).toContain('overflow-x-auto')
  })

  it('shows max/min temperature, precipitation and weather icon', () => {
    const c = w.findAll('[data-testid="day-card"]')[1]
    expect(c.text()).toContain('31°')
    expect(c.text()).toContain('22°')
    expect(c.text()).toContain('1.5 mm')
    expect(c.get('[data-testid="weather-icon"]').text()).toBe('🌧️')
    expect(c.get('[data-testid="weather-icon"]').attributes('aria-label')).toBe('Chuva')
  })

  describe('day detail modal', () => {
    const mkHourly = () => {
      const f = makeForecast(['2026-09-19', '2026-09-20', '2026-09-21'])
      return mount(ForecastCards, {
        props: { daily: f.daily, hourly: f.hourly },
        global: { plugins: [i18n] },
      })
    }

    it('every card is a button that opens the detail of THAT day', async () => {
      const m = mkHourly()
      const cards = m.findAll('[data-testid="day-card"]')
      expect(cards.every((c) => c.element.tagName === 'BUTTON')).toBe(true)
      expect(m.get('dialog').attributes('open')).toBeUndefined()
      await cards[2].trigger('click')
      expect(m.get('dialog').attributes('open')).toBeDefined()
      expect(m.get('[data-testid="day-date"]').text()).toContain('21/09')
    })

    it('navigating inside the modal changes the day without closing it', async () => {
      const m = mkHourly()
      await m.findAll('[data-testid="day-card"]')[1].trigger('click')
      await m.get('[data-testid="day-next"]').trigger('click')
      expect(m.get('dialog').attributes('open')).toBeDefined()
      expect(m.get('[data-testid="day-date"]').text()).toContain('21/09')
      await m.get('[data-testid="day-prev"]').trigger('click')
      await m.get('[data-testid="day-prev"]').trigger('click')
      expect(m.get('[data-testid="day-date"]').text()).toContain('19/09')
    })

    it('closing resets it, and reopening another card shows that card', async () => {
      const m = mkHourly()
      await m.findAll('[data-testid="day-card"]')[0].trigger('click')
      await m.get('[data-testid="day-close"]').trigger('click')
      expect(m.get('dialog').attributes('open')).toBeUndefined()
      await m.findAll('[data-testid="day-card"]')[1].trigger('click')
      expect(m.get('[data-testid="day-date"]').text()).toContain('20/09')
    })
  })

  it('uses weather_code for the icon, ignoring precipitation', () => {
    const d = { ...daily, weather_code: [0, 95, 71], precipitation_sum: [30, 0, 0] }
    const m = mount(ForecastCards, { props: { daily: d }, global: { plugins: [i18n] } })
    expect(m.findAll('[data-testid="weather-icon"]').map((i) => i.text())).toEqual(['☀️', '⛈️', '❄️'])
  })

  it('shows the UV index (max of the day), coloured by level with the level in the tooltip', () => {
    const d = { ...daily, uv_index_max: [2, 8.4, 12] }
    const m = mount(ForecastCards, { props: { daily: d }, global: { plugins: [i18n] } })
    const uv = m.findAll('[data-testid="uv"]')
    expect(uv).toHaveLength(3)
    expect(uv[0].text()).toContain('UV 2')
    expect(uv[1].text()).toContain('UV 8')
    expect(uv[1].get('[data-testid="badge"]').classes()).toContain('bg-wind-extreme')
    expect(uv[2].get('[data-testid="badge"]').attributes('title')).toContain('Extremo')
  })

  it('omits the UV line when the API has no value for the day', () => {
    expect(w.find('[data-testid="uv"]').exists()).toBe(false)
  })

  it('has the scroll sync toggle in its header', () => {
    expect(w.find('button[role="switch"]').exists()).toBe(true)
  })

  it('has a translated title', () => {
    expect(w.text()).toContain('Previsão de 16 dias')
  })

  describe('temperature unit', () => {
    it('shows max/min in Fahrenheit when chosen, and switches live', async () => {
      const m = mount(ForecastCards, { props: { daily }, global: { plugins: [i18n] } })
      const first = () => m.findAll('[data-testid="day-card"]')[0].text()
      expect(first()).toContain('30° 21°') // 30.4 / 20.6 C
      useUnitsStore().setTemperature('F')
      await m.vm.$nextTick()
      expect(first()).toContain('87° 69°') // 86.72 / 69.08 F
      useUnitsStore().setTemperature('C')
      await m.vm.$nextTick()
      expect(first()).toContain('30° 21°')
    })
  })

  describe('alerts', () => {
    const dates = ['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']
    const base = makeForecast(dates)
    const calm = {
      ...base.hourly,
      wind_speed_10m: base.hourly.wind_speed_10m.map(() => 5),
      wind_gusts_10m: base.hourly.wind_speed_10m.map(() => 8),
    }
    const mkAlerts = (
      over: Partial<typeof base.daily> = {},
      hourly: typeof calm | null = calm,
      marine?: ReturnType<typeof makeMarine>['hourly'] | null,
    ) =>
      mount(ForecastCards, {
        props: {
          daily: { ...base.daily, precipitation_sum: [0, 0, 0, 0], weather_code: [0, 0, 0, 0], ...over },
          hourly,
          marine,
        },
        global: { plugins: [i18n] },
      })

    it('shows no row and no banner when nothing is active', () => {
      const w = mkAlerts()
      expect(w.find('[data-testid="alert-row"]').exists()).toBe(false)
      expect(w.find('[data-testid="alert-banner"]').exists()).toBe(false)
    })

    it('shows the row only on the days that have an alert', () => {
      const w = mkAlerts({ precipitation_sum: [0, 30, 0, 0] })
      const cards = w.findAll('[data-testid="day-card"]')
      expect(cards.map((c) => c.find('[data-testid="alert-row"]').exists())).toEqual([
        false,
        true,
        false,
        false,
      ])
      const icon = cards[1].get('[data-testid="alert-icon"]')
      expect(icon.attributes('data-category')).toBe('rain')
      expect(icon.attributes('data-severity')).toBe('moderate')
    })

    it('a snow day with heavy precipitation shows a snow alert, not a rain one', () => {
      const w = mkAlerts({ precipitation_sum: [40, 0, 0, 0], weather_code: [75, 0, 0, 0] })
      const icons = w.findAll('[data-testid="day-card"]')[0].findAll('[data-testid="alert-icon"]')
      expect(icons.map((i) => i.attributes('data-category'))).toEqual(['snow'])
      expect(icons[0].attributes('title')).toContain('Neve (severo)')
      expect(w.find('[data-category="rain"]').exists()).toBe(false)
    })

    it('shows a heat alert from the feels-like temperature, and the banner when it is high', () => {
      const w = mkAlerts({ apparent_temperature_max: [39, 30, 30, 30] })
      const icon = w.findAll('[data-testid="day-card"]')[0].get('[data-category="heat"]')
      expect(icon.attributes('data-severity')).toBe('high')
      expect(w.get('[data-testid="banner-item"]').text()).toContain('Calor (alto)')
    })

    it('shows several categories on one day', () => {
      const w = mkAlerts({ precipitation_sum: [60, 0, 0, 0], weather_code: [96, 0, 0, 0] })
      const icons = w.findAll('[data-testid="day-card"]')[0].findAll('[data-testid="alert-icon"]')
      expect(icons.map((i) => i.attributes('data-category'))).toEqual(['rain', 'storm'])
    })

    it('shows the sea alert only when the location has ocean data', () => {
      const marine = makeMarine(true, dates).hourly
      marine.wave_height = marine.wave_height.map(() => 3)
      const withSea = mkAlerts({}, calm, marine)
      expect(withSea.find('[data-category="sea"]').exists()).toBe(true)
      expect(mkAlerts({}, calm, null).find('[data-category="sea"]').exists()).toBe(false)
      const inland = makeMarine(false, dates).hourly
      expect(mkAlerts({}, calm, inland).find('[data-category="sea"]').exists()).toBe(false)
    })

    it('wind alert comes from the hourly wind of that day', () => {
      const h = { ...calm, wind_speed_10m: calm.wind_speed_10m.map((v, i) => (i === 24 + 5 ? 60 : v)) }
      const w = mkAlerts({}, h)
      const cards = w.findAll('[data-testid="day-card"]')
      expect(cards[1].get('[data-category="wind"]').attributes('data-severity')).toBe('severe')
      expect(cards[0].find('[data-category="wind"]').exists()).toBe(false)
    })

    it('a gust over the limit raises the wind alert even with calm sustained wind (14 kt / 28 kt -> moderate)', () => {
      const h = { ...calm, wind_gusts_10m: calm.wind_gusts_10m.map((v, i) => (i === 5 ? 28 : v)) }
      const cards = mkAlerts({}, h).findAll('[data-testid="day-card"]')
      expect(cards[0].get('[data-category="wind"]').attributes('data-severity')).toBe('moderate')
      expect(cards[1].find('[data-category="wind"]').exists()).toBe(false)
    })

    it('banner: appears for high/severe within the next 3 days and summarizes category, level and days', () => {
      const w = mkAlerts({ precipitation_sum: [0, 0, 120, 0], weather_code: [0, 99, 0, 0] })
      const banner = w.get('[data-testid="alert-banner"]')
      const items = banner.findAll('[data-testid="banner-item"]').map((i) => i.text())
      expect(items).toHaveLength(2)
      expect(items[0]).toContain('🌧️ Chuva (severo)')
      expect(items[0]).toContain('21/09') // the day it happens
      expect(items[1]).toContain('⛈️ Tempestade (severo)')
      expect(items[1]).toContain('20/09')
      expect(banner.text()).toContain('próximos 3 dias')
      expect(banner.text()).toContain('não é um alerta oficial')
      expect(banner.classes()).toContain('bg-wind-extreme')
    })

    it('banner uses the orange tone when the worst level is high', () => {
      expect(
        mkAlerts({ precipitation_sum: [55, 0, 0, 0] })
          .get('[data-testid="alert-banner"]')
          .classes(),
      ).toContain('bg-wind-strong')
    })

    it('banner ignores moderate alerts and anything beyond the third day', () => {
      expect(
        mkAlerts({ precipitation_sum: [25, 25, 25, 0] })
          .find('[data-testid="alert-banner"]')
          .exists(),
      ).toBe(false)
    })

    it('banner does not reach days 6-8, but their cards still show the alerts (Everest 24-26/09)', () => {
      const dates = Array.from({ length: 10 }, (_, i) => `2026-09-${String(19 + i).padStart(2, '0')}`)
      const f = makeForecast(dates)
      const w = mount(ForecastCards, {
        props: {
          daily: {
            ...f.daily,
            precipitation_sum: [0, 0, 0, 0, 0, 16.5, 10.5, 32.4, 0, 0],
            weather_code: [0, 0, 0, 0, 0, 75, 73, 86, 0, 0],
            temperature_2m_max: dates.map(() => -20),
            temperature_2m_min: dates.map(() => -25),
          },
        },
        global: { plugins: [i18n] },
      })
      expect(w.find('[data-testid="alert-banner"]').exists()).toBe(false)
      const cards = w.findAll('[data-testid="day-card"]')
      expect(
        [5, 6, 7].map((i) => cards[i].get('[data-testid="alert-icon"]').attributes('data-severity')),
      ).toEqual(['high', 'moderate', 'severe'])
    })

    it('banner lists the dates of each alert, including several days of the same category', () => {
      const w = mkAlerts({ precipitation_sum: [60, 0, 120, 0] })
      const days = w.get('[data-testid="banner-item"] [data-testid="banner-days"]').text()
      expect(days).toBe('sáb., 19/09, seg., 21/09')
    })

    it('works without hourly data (no wind alert, nothing breaks)', () => {
      const w = mkAlerts({ precipitation_sum: [30, 0, 0, 0] }, null)
      expect(w.findAll('[data-testid="alert-icon"]')).toHaveLength(1)
    })
  })
})
