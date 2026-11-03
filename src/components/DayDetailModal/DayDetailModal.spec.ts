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

  describe('hourly icons', () => {
    // daily = 95 (the day's worst event); each hour has its own code, night before 6h and from 18h
    const HOURLY: Record<number, number> = { 0: 0, 3: 2, 6: 0, 9: 2, 12: 3, 14: 95, 16: 81, 19: 80, 21: 61 }
    const mkStormDay = () => {
      const f = makeForecast(days)
      const hour = (i: number) => i % 24
      return mount(DayDetailModal, {
        props: {
          daily: { ...f.daily, weather_code: days.map(() => 95), precipitation_sum: days.map(() => 2) },
          hourly: {
            ...f.hourly,
            weather_code: f.hourly.time.map((_, i) => HOURLY[hour(i)] ?? 0),
            is_day: f.hourly.time.map((_, i) => (hour(i) >= 6 && hour(i) < 18 ? 1 : 0)),
            precipitation: f.hourly.time.map((_, i) => (i === 24 + 14 ? 2 : 0)),
          },
          index: 1,
        },
        global: { plugins: [i18n] },
      })
    }

    it('each hour shows its own code, not the daily 95', () => {
      const w = mkStormDay()
      const icons = w.findAll('[data-testid="temp-icon"]')
      expect(icons).toHaveLength(24)
      const at = (h: number) => icons[h].text()
      expect(at(6)).toBe('☀️')
      expect(at(9)).toBe('⛅')
      expect(at(12)).toBe('☁️')
      expect(at(14)).toBe('⛈️') // the only stormy hour
      expect(at(16)).toBe('🌦️')
      expect(icons.filter((i) => i.text() === '⛈️')).toHaveLength(1)
      expect(icons[12].attributes('aria-label')).toBe('Nublado')
      expect(icons[14].attributes('aria-label')).toBe('Tempestade')
    })

    it('night hours (is_day = 0) show the moon / sunless variants', () => {
      const icons = mkStormDay().findAll('[data-testid="temp-icon"]')
      expect(icons[0].text()).toBe('🌙') // clear
      expect(icons[3].text()).toBe('☁️') // partly cloudy
      expect(icons[19].text()).toBe('🌧️') // showers
      expect(icons[21].text()).toBe('🌧️') // rain has no sun anyway
      expect(icons[0].attributes('aria-label')).toBe(icons[6].attributes('aria-label')) // same condition
    })

    it('the header shows the average daytime condition, not the daily 95', () => {
      // daylight 6h-17h: 8 clear (0), partly cloudy 9h (1), overcast 12h (2), thunder 14h (5, 2 mm),
      // showers 16h (4, 0 mm) => average 12 / 12 = 1 => partly cloudy, + isolated thunder
      const w = mkStormDay()
      const header = w.get('[data-testid="day-weather"]')
      expect(header.text()).toBe('⛅⚡')
      expect(header.attributes('aria-label')).toBe('Parcialmente nublado')
      expect(header.attributes('tabindex')).toBe('0') // keyboard reaches the tooltip
      const tip = w.get(`#${header.attributes('aria-describedby')}`)
      expect(tip.attributes('role')).toBe('tooltip')
      expect(tip.text()).toContain('Parcialmente nublado · trovoadas isoladas (1 h, 2 mm, por volta das 14h)')
      expect(tip.text()).toContain('Ícone pela média das condições durante o dia (sem o período noturno)')
    })

    it('each hour icon has a tooltip with the WMO name and the hour precipitation', async () => {
      const w = mkStormDay()
      const icons = w.findAll('[data-testid="temp-icon"]')
      const describedBy = (h: number) => w.get(`#${icons[h].attributes('aria-describedby')}`).text()
      expect(describedBy(14)).toBe('Trovoada · 2 mm')
      expect(describedBy(16)).toBe('Pancadas de chuva moderadas') // code 81, 0 mm
      expect(describedBy(6)).toBe('Céu limpo')
      // the visible bubble follows hover / focus
      await icons[14].trigger('mouseenter')
      expect(w.get('[data-testid="hour-tip"]').text()).toBe('Trovoada · 2 mm')
      expect(w.get('[data-testid="hour-tip"]').attributes('data-open')).toBe('true')
      await icons[14].trigger('mouseleave')
      await icons[6].trigger('focus')
      expect(w.get('[data-testid="hour-tip"]').text()).toBe('Céu limpo')
      expect(icons[6].attributes('tabindex')).toBe('0')
    })

    it('without hourly codes the hours are unknown, never the daily code', () => {
      const icons = mk(1).findAll('[data-testid="temp-icon"]')
      expect(icons.some((i) => i.text() === '🌧️')).toBe(false)
      expect(new Set(icons.map((i) => i.attributes('aria-label')))).toEqual(new Set(['Tempo']))
    })
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
