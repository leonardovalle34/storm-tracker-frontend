import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import SunTimes from './SunTimes.vue'

const mk = (props: { sunrise?: string | null; sunset?: string | null }) =>
  mount(SunTimes, { props, global: { plugins: [i18n] } })

describe('SunTimes', () => {
  beforeEach(() => setLocale('pt'))

  it('shows sunrise and sunset as HH:MM, straight from the local string', () => {
    const w = mk({ sunrise: '2026-09-19T05:50', sunset: '2026-09-19T18:07' })
    expect(w.get('[data-testid="sunrise"]').text()).toBe('05:50')
    expect(w.get('[data-testid="sunset"]').text()).toBe('18:07')
  })

  it('icons carry a translated aria-label', async () => {
    const w = mk({ sunrise: '2026-09-19T05:50', sunset: '2026-09-19T18:07' })
    const labels = () => w.findAll('svg[role="img"]').map((s) => s.attributes('aria-label'))
    expect(labels()).toEqual(['Nascer do sol', 'Pôr do sol'])
    setLocale('en')
    await w.vm.$nextTick()
    expect(labels()).toEqual(['Sunrise', 'Sunset'])
  })

  it('drops only the missing half', () => {
    const w = mk({ sunrise: '2026-09-19T05:50', sunset: undefined })
    expect(w.find('[data-testid="sunrise"]').exists()).toBe(true)
    expect(w.find('[data-testid="sunset"]').exists()).toBe(false)
  })

  it('renders nothing when both are missing or malformed (no "Invalid Date" or placeholder)', () => {
    for (const props of [{}, { sunrise: null, sunset: null }, { sunrise: 'garbage', sunset: '' }]) {
      const w = mk(props)
      expect(w.find('[data-testid="sun-times"]').exists()).toBe(false)
      expect(w.text()).toBe('')
    }
  })
})
