import type { DailyForecast, HourlyForecast } from '@/types/weather'

/** mm over the daylight hours from which the day's worst precipitation wins over the average */
export const LIMIT_MM = 5
/** daylight hours with rain (precipitation > 0) from which the same applies; fewer is "isolated" rain */
export const LIMIT_HOURS = 3

/**
 * Severity score per WMO code: 0 clear, 1 partly cloudy, 2 overcast / fog, 3 drizzle,
 * 4 rain / showers / snow, 5 thunderstorm. Codes outside the table are ignored.
 */
export const SCORE_TABLE: readonly { score: number; codes: readonly number[] }[] = [
  { score: 0, codes: [0, 1] },
  { score: 1, codes: [2] },
  { score: 2, codes: [3, 45, 48] },
  { score: 3, codes: [51, 53, 55, 56, 57] },
  { score: 4, codes: [61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86] },
  { score: 5, codes: [95, 96, 99] },
]
/** scores from here up are precipitation (drizzle, rain / snow, thunderstorm) */
const PRECIPITATION_SCORE = 3

export type Isolated = 'none' | 'rain' | 'thunder'

export interface DailyCondition {
  /** WMO code for the day's icon; null only when there is neither hourly nor daily code */
  code: number | null
  /** a little rain (or thunder) by day on an otherwise dry day: a small badge on the icon */
  isolated: Isolated
  /** mean score of the daylight hours (SCORE_TABLE); the daily code's score on the fallback */
  averageScore: number
  /** daylight hours with precipitation > 0 */
  rainHours: number
  /**
   * "HH:MM" local time, cut from hourly.time. Open-Meteo's hourly precipitation is the sum of the
   * PRECEDING hour, so the window starts one hour before the first rainy timestamp.
   */
  rainWindow?: { start: string; end: string }
  /** mm over the daylight hours; the daily precipitation_sum when there is no hourly precipitation */
  precipitationSum: number
}

const SCORE = new Map(SCORE_TABLE.flatMap(({ score, codes }) => codes.map((c) => [c, score] as const)))
const scoreOf = (code: number | null | undefined) => (code == null ? undefined : SCORE.get(code))
const isThunder = (code: number | null | undefined) => code != null && code >= 95 && code <= 99

/** Most frequent code with `score` in `codes`; ties keep the higher (more severe) code. */
function mostFrequentCode(codes: number[], score: number): number {
  const counts = new Map<number, number>()
  for (const c of codes) if (scoreOf(c) === score) counts.set(c, (counts.get(c) ?? 0) + 1)
  let best = -1
  let bestCount = 0
  for (const [c, n] of counts) if (n > bestCount || (n === bestCount && c > best)) [best, bestCount] = [c, n]
  return best
}

/** "HH:MM" one hour earlier, wrapping at midnight; string arithmetic only (no Date, no timezone) */
const hourBefore = (hhmm: string) =>
  `${String((Number(hhmm.slice(0, 2)) + 23) % 24).padStart(2, '0')}${hhmm.slice(2)}`

export interface DayHoursInput {
  /** the 24 (or fewer) hourly values of ONE day, all aligned by index */
  time?: readonly string[] | null
  codes?: readonly (number | null | undefined)[] | null
  /** 1 = daylight, 0 = night */
  isDay?: readonly (number | null | undefined)[] | null
  /** mm in the preceding hour */
  precipitation?: readonly (number | null | undefined)[] | null
  /** daily precipitation_sum of that day, mm: only used when there is no hourly precipitation */
  precipitationSum?: number | null
  /** daily weather_code (the day's most severe event): fallback when there are no hourly codes */
  dailyCode?: number | null
}

/**
 * The average daytime condition, for the daily icon (cards and modal header). The daily weather_code
 * is the worst hour of the day (night included), so one stormy hour turned every day into ⛈️. Rule:
 *  - only daylight hours (is_day = 1) count; all hours when the day has none;
 *  - averageScore = mean SCORE_TABLE score of those hours;
 *  - among the scores that occur in those hours (never one that did not), the closest to the
 *    average wins; ties go to the more severe one;
 *  - relevant rain (>= LIMIT_MM over those hours, or >= LIMIT_HOURS of them with precipitation > 0)
 *    wins over the average: the most severe precipitation score present;
 *  - isolated rain (dry result, 1..LIMIT_HOURS-1 hours with rain, < LIMIT_MM): isolated = 'rain', or
 *    'thunder' when one of those hours has a 95-99 code. A drizzle code with 0 mm is not rain;
 *  - within the chosen score, its most frequent code;
 *  - no hourly codes: the daily code, isolated = 'none'.
 * Alerts do NOT use this: they keep the daily code, the worst event of the day, night included.
 */
export function dailyCondition({
  time,
  codes,
  isDay,
  precipitation,
  precipitationSum,
  dailyCode,
}: DayHoursInput): DailyCondition {
  const all = (codes ?? []).flatMap((code, i) => (scoreOf(code) === undefined ? [] : [i]))
  if (!all.length) {
    return {
      code: dailyCode ?? null,
      isolated: 'none',
      averageScore: scoreOf(dailyCode) ?? 0,
      rainHours: 0,
      precipitationSum: precipitationSum ?? 0,
    }
  }

  const daylight = all.filter((i) => isDay?.[i] === 1)
  const hours = daylight.length ? daylight : all
  const code = (i: number) => codes![i] as number
  const hourCodes = hours.map(code)
  const scores = hourCodes.map((c) => scoreOf(c)!)
  const averageScore = scores.reduce((s, v) => s + v, 0) / scores.length

  // rain of the same hours (daylight, or all on a day without daylight)
  const rainy = precipitation ? hours.filter((i) => (precipitation[i] ?? 0) > 0) : []
  const sum = precipitation
    ? Math.round(hours.reduce((s, i) => s + (precipitation[i] ?? 0), 0) * 10) / 10
    : (precipitationSum ?? 0)
  const first = time?.[rainy[0]]
  const last = time?.[rainy[rainy.length - 1]]
  const rain = {
    averageScore,
    rainHours: rainy.length,
    precipitationSum: sum,
    ...(first && last
      ? { rainWindow: { start: hourBefore(first.slice(11, 16)), end: last.slice(11, 16) } }
      : {}),
  }

  const worst = Math.max(...scores)
  if ((sum >= LIMIT_MM || rainy.length >= LIMIT_HOURS) && worst >= PRECIPITATION_SCORE)
    return { code: mostFrequentCode(hourCodes, worst), isolated: 'none', ...rain }

  let chosen = scores[0]
  for (const s of new Set(scores)) {
    const d = Math.abs(s - averageScore)
    const best = Math.abs(chosen - averageScore)
    if (d < best - 1e-9 || (Math.abs(d - best) <= 1e-9 && s > chosen)) chosen = s
  }

  let isolated: Isolated = 'none'
  if (chosen < PRECIPITATION_SCORE && rainy.length >= 1 && rainy.length < LIMIT_HOURS && sum < LIMIT_MM)
    isolated = rainy.some((i) => isThunder(code(i))) ? 'thunder' : 'rain'

  return { code: mostFrequentCode(hourCodes, chosen), isolated, ...rain }
}

/** dailyCondition of day `i` of `daily`, taking that day's hours out of `hourly`. */
export function dayCondition(
  daily: Pick<DailyForecast, 'time' | 'weather_code' | 'precipitation_sum'>,
  hourly: Pick<HourlyForecast, 'time' | 'weather_code' | 'is_day' | 'precipitation'> | null | undefined,
  i: number,
): DailyCondition {
  const date = daily.time[i]
  const idx = hourly && date ? hourly.time.flatMap((t, j) => (t.startsWith(date) ? [j] : [])) : []
  const pick = <T>(values?: readonly T[] | null) => (values ? idx.map((j) => values[j] ?? null) : null)
  return dailyCondition({
    time: hourly ? idx.map((j) => hourly.time[j]) : [],
    codes: pick(hourly?.weather_code),
    isDay: pick(hourly?.is_day),
    precipitation: pick(hourly?.precipitation),
    precipitationSum: daily.precipitation_sum?.[i],
    dailyCode: daily.weather_code?.[i],
  })
}
