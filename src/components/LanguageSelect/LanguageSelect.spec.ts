import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n, setLocale } from '@/i18n'
import LanguageSelect from './LanguageSelect.vue'

describe('LanguageSelect', () => {
  it('lists pt/en/es/fr/de and changes locale', async () => {
    setLocale('pt')
    const w = mount(LanguageSelect, { global: { plugins: [i18n] } })
    expect(w.findAll('option').map((o) => o.attributes('value'))).toEqual(['pt', 'en', 'es', 'fr', 'de'])
    await w.get('select').setValue('es')
    expect(i18n.global.locale.value).toBe('es')
    await w.get('select').setValue('fr')
    expect(i18n.global.locale.value).toBe('fr')
    await w.get('select').setValue('de')
    expect(i18n.global.locale.value).toBe('de')
    setLocale('pt')
  })
})
