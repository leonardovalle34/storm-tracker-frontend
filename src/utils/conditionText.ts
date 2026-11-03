import { dayCondition, type DailyCondition } from './dailyCondition'
import { describeWeather, wmoNameKey } from './weatherCode'

type Translate = (key: string, values?: Record<string, unknown>) => string

/** mm with at most one decimal, in the locale's format (0,4 in pt, 0.4 in en) */
export const formatMm = (mm: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(mm)

// "15:00" -> "15h" / "15:00" / "15 Uhr": the hour is cut from the local-time string, no Date
const hourText = (hhmm: string, t: Translate) => t('forecast.tip.hour', { h: hhmm.slice(0, 2) })

/**
 * Tooltip of a day icon (card and modal header): the condition plus a rain summary of the daylight
 * hours, then a note that the icon is the average of the daytime conditions.
 */
export function dayTipLines(c: DailyCondition, name: string, t: Translate, locale: string): string[] {
  const mm = formatMm(c.precipitationSum, locale)
  let summary = ''
  if (c.isolated !== 'none') {
    const w = c.rainWindow
    const when = !w
      ? ''
      : c.rainHours === 1
        ? t('forecast.tip.around', { time: hourText(w.end, t) })
        : t('forecast.tip.between', { start: hourText(w.start, t), end: hourText(w.end, t) })
    summary = t('forecast.tip.isolatedDetail', {
      label: t(`forecast.tip.isolated.${c.isolated}`),
      hours: c.rainHours,
      mm,
      when,
    })
  } else if (c.rainHours > 0) summary = t('forecast.tip.amountHours', { mm, hours: c.rainHours })
  else if (c.precipitationSum > 0) summary = t('forecast.tip.amount', { mm })
  return [summary ? `${name} · ${summary}` : name, t('forecast.tip.note')]
}

/** Tooltip of one hour of the day chart: the WMO name of the hour, plus its precipitation if any. */
export function hourTip(
  code: number | null | undefined,
  precipitation: number | null | undefined,
  t: Translate,
  locale: string,
): string {
  const name = t(wmoNameKey(code))
  return precipitation != null && precipitation > 0
    ? `${name} · ${t('forecast.tip.amount', { mm: formatMm(precipitation, locale) })}`
    : name
}

/** Everything a day icon needs (card and modal header share it): icon, badge, name and tooltip. */
export function dayIconInfo(
  daily: Parameters<typeof dayCondition>[0],
  hourly: Parameters<typeof dayCondition>[1],
  i: number,
  t: Translate,
  locale: string,
) {
  const c = dayCondition(daily, hourly, i)
  const weather = describeWeather(c.code)
  const label = t(`weather.${weather.key}`)
  return {
    icon: weather.icon,
    key: weather.key,
    isolated: c.isolated,
    label,
    tip: dayTipLines(c, label, t, locale),
  }
}
