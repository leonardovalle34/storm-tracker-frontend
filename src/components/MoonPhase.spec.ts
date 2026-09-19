import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/services/api'
import { i18n, setLocale } from '@/i18n'
import MoonPhase from './MoonPhase.vue'

vi.mock('@/services/api', async (orig) => ({ ...(await orig<typeof api>()), fetchMoonPhase: vi.fn() }))
const moon = vi.mocked(api.fetchMoonPhase)

describe('MoonPhase', () => {
  beforeEach(() => {
    moon.mockReset()
    setLocale('pt')
  })

  it('shows icon and translated name for the date', async () => {
    moon.mockResolvedValue({ date: '2026-09-19', phase_index: 14, phase_name: 'Full Moon' })
    const w = mount(MoonPhase, { props: { date: '2026-09-19' }, global: { plugins: [i18n] } })
    await flushPromises()
    expect(moon).toHaveBeenCalledWith('2026-09-19')
    expect(w.text()).toContain('🌕')
    expect(w.text()).toContain('Lua Cheia')
    setLocale('en')
    await flushPromises()
    expect(w.text()).toContain('Full Moon')
  })

  it('shows a friendly inline message on a 400 (invalid date)', async () => {
    moon.mockRejectedValue(new api.ApiError(400, 'Invalid date format'))
    const w = mount(MoonPhase, { props: { date: 'garbage' }, global: { plugins: [i18n] } })
    await flushPromises()
    const msg = w.get('[data-testid="moon-error"]')
    expect(msg.text()).toBe('Data inválida para a fase da lua.')
    expect(msg.attributes('title')).toBe('Invalid date format')
    expect(w.find('[data-testid="moon-phase"]').exists()).toBe(false)
  })

  it('renders nothing when the lookup fails otherwise', async () => {
    moon.mockRejectedValue(new Error('429'))
    const w = mount(MoonPhase, { props: { date: '2026-09-19' }, global: { plugins: [i18n] } })
    await flushPromises()
    expect(w.text()).toBe('')
  })
})
