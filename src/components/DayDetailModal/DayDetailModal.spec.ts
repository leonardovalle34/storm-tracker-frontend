import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import { useLocationStore } from '@/stores/location'
import { useUnitsStore } from '@/stores/units'
import { useWeatherStore } from '@/stores/weather'
import { makeForecast } from '@/test/fixtures'
import DayDetailModal from './DayDetailModal.vue'

const days = ['2026-09-19', '2026-09-20', '2026-09-21']
const mk = (
  index: number | null = 1,
  hourlyOverride?: Partial<ReturnType<typeof makeForecast>['hourly']>,
) => {
  const f = makeForecast(days)
  useLocationStore().location = { name: 'Santos', latitude: -23.96, longitude: -46.33 }
  return mount(DayDetailModal, {
    props: { daily: f.daily, hourly: { ...f.hourly, ...hourlyOverride }, index },
    global: { plugins: [i18n] },
  })
}

describe('DayDetailModal', () => {
  setLocale('pt')

  it('is a native <dialog>, closed until an index is given', async () => {
    const w = mk(null)
    expect(w.get('dialog').attributes('open')).toBeUndefined()
    await w.setProps({ index: 1 })
    expect(w.get('dialog').attributes('open')).toBeDefined()
  })

  it('header: place name, the clicked date and the weather icon of the day', () => {
    const w = mk(1)
    expect(w.get('[data-testid="day-place"]').text()).toBe('Santos')
    expect(w.get('[data-testid="day-date"]').text().toLowerCase()).toContain('20/09')
    expect(w.get('[data-testid="day-weather"]').text()).toBe('🌧️')
    expect(w.get('[data-testid="day-weather"]').attributes('aria-label')).toBe('Chuva')
  })

  it('another day shows max / min', () => {
    const w = mk(1)
    expect(w.get('[data-testid="day-temps"]').text()).toContain('31°')
    expect(w.get('[data-testid="day-temps"]').text()).toContain('22°')
    expect(w.find('[data-testid="day-current"]').exists()).toBe(false)
  })

  it('today (first day) shows the current temperature when the backend sends it', () => {
    const w = mk(0)
    useWeatherStore().forecast = { ...makeForecast(days), current: { temperature_2m: 27.6 } }
    return w.vm.$nextTick().then(() => {
      expect(w.get('[data-testid="day-current"]').text()).toBe('28°C')
    })
  })

  it('today without `current` falls back to max / min', () => {
    const w = mk(0)
    expect(w.find('[data-testid="day-current"]').exists()).toBe(false)
    expect(w.get('[data-testid="day-temps"]').text()).toContain('30°')
  })

  it('shows the full hourly chart (24 hours) of the selected day', () => {
    const w = mk(1)
    expect(w.findAll('[data-testid="temp-value"]')).toHaveLength(24)
    // fixture: 20 + h/2 => 20° at 0h
    expect(w.findAll('[data-testid="temp-value"]')[0].text()).toBe('20°')
  })

  it('respects the temperature unit', async () => {
    const w = mk(1)
    useUnitsStore().setTemperature('F')
    await w.vm.$nextTick()
    expect(w.findAll('[data-testid="temp-value"]')[0].text()).toBe('68°') // 20 C
    expect(w.get('[data-testid="day-temps"]').text()).toContain('89°') // 31.4 C
  })

  it('uses the hourly weather_code when present, else the daily one on every hour', () => {
    const plain = mk(1)
    expect(new Set(plain.findAll('[data-testid="temp-icon"]').map((i) => i.text()))).toEqual(new Set(['🌧️']))
    const time = makeForecast(days).hourly.time
    const withCodes = mk(1, { weather_code: time.map(() => 0) })
    expect(new Set(withCodes.findAll('[data-testid="temp-icon"]').map((i) => i.text()))).toEqual(
      new Set(['☀️']),
    )
  })

  it('says so when the day has no hourly temperatures', () => {
    const w = mk(1, { temperature_2m: undefined })
    expect(w.find('svg').exists()).toBe(false)
    expect(w.get('[data-testid="day-no-hourly"]').text()).toContain('Sem dados horários')
  })

  describe('previous / next arrows', () => {
    it('go to the previous and next day without closing', async () => {
      const w = mk(1)
      await w.get('[data-testid="day-next"]').trigger('click')
      await w.get('[data-testid="day-prev"]').trigger('click')
      expect(w.emitted('update:index')).toEqual([[2], [0]])
      expect(w.get('dialog').attributes('open')).toBeDefined()
    })

    it('◀ is disabled on the first day and ▶ on the last', () => {
      expect(mk(0).get('[data-testid="day-prev"]').attributes('disabled')).toBeDefined()
      expect(mk(0).get('[data-testid="day-next"]').attributes('disabled')).toBeUndefined()
      expect(mk(2).get('[data-testid="day-next"]').attributes('disabled')).toBeDefined()
      expect(mk(2).get('[data-testid="day-prev"]').attributes('disabled')).toBeUndefined()
    })

    it('have accessible names, translated, and the content follows the new index', async () => {
      const w = mk(1)
      expect(w.get('[data-testid="day-prev"]').attributes('aria-label')).toBe('Dia anterior')
      expect(w.get('[data-testid="day-next"]').attributes('aria-label')).toBe('Próximo dia')
      await w.setProps({ index: 2 })
      expect(w.get('[data-testid="day-date"]').text()).toContain('21/09')
      expect(w.get('[data-testid="day-temps"]').text()).toContain('32°')
      expect(w.findAll('[data-testid="temp-value"]')).toHaveLength(24)
    })

    it('ArrowLeft / ArrowRight also navigate', async () => {
      const w = mk(1)
      await w.get('dialog').trigger('keydown', { key: 'ArrowRight' })
      await w.get('dialog').trigger('keydown', { key: 'ArrowLeft' })
      expect(w.emitted('update:index')).toEqual([[2], [0]])
    })
  })

  describe('closing', () => {
    it('close button, backdrop click and the native close event all emit null', async () => {
      const w = mk(1)
      const reopen = async () => {
        await w.setProps({ index: null })
        await w.setProps({ index: 1 })
        expect(w.get('dialog').attributes('open')).toBeDefined()
      }
      await w.get('[data-testid="day-close"]').trigger('click')
      expect(w.get('dialog').attributes('open')).toBeUndefined()
      await reopen()
      await w.get('dialog').trigger('click') // target === dialog => backdrop
      expect(w.get('dialog').attributes('open')).toBeUndefined()
      await reopen()
      await w.get('dialog').trigger('close') // Esc: the browser already closed it
      expect(w.emitted('update:index')).toEqual([[null], [null], [null]])
    })

    it('clicking inside the content does not close it', async () => {
      const w = mk(1)
      await w.get('[data-testid="day-place"]').trigger('click')
      expect(w.get('dialog').attributes('open')).toBeDefined()
    })
  })

  it('the close control is an icon-only ✕ button with an accessible name', () => {
    const b = mk(1).get('[data-testid="day-close"]')
    expect(b.text()).toBe('✕')
    expect(b.attributes('aria-label')).toBe('Fechar')
  })

  it('is labelled with place and date', () => {
    const w = mk(1)
    expect(w.get('dialog').attributes('aria-label')).toContain('Santos')
  })
})
