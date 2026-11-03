import { describe, expect, it } from 'vitest'
import { i18n, setLocale, type LocaleCode } from '@/i18n'
import de from '@/i18n/locales/de'
import en from '@/i18n/locales/en'
import es from '@/i18n/locales/es'
import fr from '@/i18n/locales/fr'
import pt from '@/i18n/locales/pt'
import { dayTipLines, formatMm, hourTip } from './conditionText'
import type { DailyCondition } from './dailyCondition'

const t = (key: string, values?: Record<string, unknown>) => i18n.global.t(key, values ?? {})
const tip = (c: Partial<DailyCondition>, name: string, locale: LocaleCode = 'pt') => {
  setLocale(locale)
  return dayTipLines(
    { code: 0, isolated: 'none', averageScore: 0, rainHours: 0, precipitationSum: 0, ...c },
    name,
    t,
    locale,
  )
}

describe('day tooltip', () => {
  it('dry day: just the condition, then the note', () => {
    expect(tip({}, 'Parcialmente nublado')).toEqual([
      'Parcialmente nublado',
      'Ícone pela média das condições durante o dia (sem o período noturno)',
    ])
  })

  it('isolated rain, one hour: "around" the hour', () => {
    const c = {
      isolated: 'rain',
      rainHours: 1,
      precipitationSum: 0.4,
      rainWindow: { start: '14:00', end: '15:00' },
    } as const
    expect(tip(c, 'Parcialmente nublado')[0]).toBe(
      'Parcialmente nublado · chuva isolada (1 h, 0,4 mm, por volta das 15h)',
    )
  })

  it('isolated thunder, several hours: "between" start and end', () => {
    const c = {
      isolated: 'thunder',
      rainHours: 2,
      precipitationSum: 3,
      rainWindow: { start: '14:00', end: '16:00' },
    } as const
    expect(tip(c, 'Nublado')[0]).toBe('Nublado · trovoadas isoladas (2 h, 3 mm, entre 14h e 16h)')
  })

  it('relevant rain: amount and hours', () => {
    expect(tip({ code: 63, rainHours: 5, precipitationSum: 8 }, 'Chuva')[0]).toBe('Chuva · 8 mm em 5 h')
  })

  it('daily fallback without hourly rain: just the amount', () => {
    expect(tip({ code: 63, precipitationSum: 1.5 }, 'Chuva')[0]).toBe('Chuva · 1,5 mm')
  })

  it('is translated, with the local number format', () => {
    const c = {
      isolated: 'rain',
      rainHours: 1,
      precipitationSum: 0.4,
      rainWindow: { start: '14:00', end: '15:00' },
    } as const
    expect(tip(c, 'Partly cloudy', 'en')).toEqual([
      'Partly cloudy · isolated rain (1 h, 0.4 mm, around 15:00)',
      'Icon shows the average daytime conditions (night excluded)',
    ])
    expect(tip(c, 'Teilweise bewölkt', 'de')[0]).toBe(
      'Teilweise bewölkt · vereinzelt Regen (1 Std., 0,4 mm, gegen 15 Uhr)',
    )
    expect(tip(c, 'Nuageux', 'fr')[0]).toBe('Nuageux · pluie isolée (1 h, 0,4 mm, vers 15 h)')
    expect(tip(c, 'Nublado', 'es')[0]).toBe('Nublado · lluvia aislada (1 h, 0,4 mm, hacia las 15:00)')
    setLocale('pt')
  })
})

describe('hour tooltip', () => {
  it('WMO name of the hour, plus its precipitation', () => {
    setLocale('pt')
    expect(hourTip(80, 0.6, t, 'pt')).toBe('Pancadas de chuva fracas · 0,6 mm')
    expect(hourTip(0, 0, t, 'pt')).toBe('Céu limpo')
    expect(hourTip(null, null, t, 'pt')).toBe('Tempo')
  })
})

describe('WMO names', () => {
  const CODES = [
    0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96,
    99,
  ]
  it.each([
    ['pt', pt],
    ['en', en],
    ['es', es],
    ['fr', fr],
    ['de', de],
  ])('every code the app uses has a %s name', (_, messages) => {
    const wmo = (messages as { wmo: Record<string, string> }).wmo
    expect(Object.keys(wmo).sort()).toEqual(CODES.map((c) => `c${c}`).sort())
    expect(Object.values(wmo).every((v) => v.length > 0)).toBe(true)
  })

  it('formats mm with at most one decimal', () => {
    expect(formatMm(0.44, 'pt')).toBe('0,4')
    expect(formatMm(3, 'en')).toBe('3')
  })
})
