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

  it('has a translated title', () => {
    expect(w.text()).toContain('Previsão de 16 dias')
  })
})
