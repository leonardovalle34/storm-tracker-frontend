import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/services/api'
import { i18n, setLocale } from '@/i18n'
import MoonPhase from './MoonPhase.vue'

vi.mock('@/services/api')
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

  it('renders nothing when the lookup fails', async () => {
    moon.mockRejectedValue(new Error('429'))
    const w = mount(MoonPhase, { props: { date: '2026-09-19' }, global: { plugins: [i18n] } })
    await flushPromises()
    expect(w.text()).toBe('')
  })
})
