import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { makeForecast } from '@/test/fixtures'
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

  it('uses weather_code for the icon, ignoring precipitation', () => {
    const d = { ...daily, weather_code: [0, 95, 71], precipitation_sum: [30, 0, 0] }
    const m = mount(ForecastCards, { props: { daily: d }, global: { plugins: [i18n] } })
    expect(m.findAll('[data-testid="weather-icon"]').map((i) => i.text())).toEqual(['☀️', '⛈️', '❄️'])
  })

  it('shows the UV index (max of the day) with its level', () => {
    const d = { ...daily, uv_index_max: [2, 8.4, 12] }
    const m = mount(ForecastCards, { props: { daily: d }, global: { plugins: [i18n] } })
    const uv = m.findAll('[data-testid="uv"]')
    expect(uv).toHaveLength(3)
    expect(uv[0].text()).toContain('UV 2')
    expect(uv[1].text()).toContain('UV 8')
    expect(uv[1].get('[data-testid="badge"]').classes()).toContain('bg-wind-extreme')
    expect(uv[2].text()).toContain('Extremo')
  })

  it('omits the UV line when the API has no value for the day', () => {
    expect(w.find('[data-testid="uv"]').exists()).toBe(false)
  })

  it('has a translated title', () => {
    expect(w.text()).toContain('Previsão de 16 dias')
  })
})
