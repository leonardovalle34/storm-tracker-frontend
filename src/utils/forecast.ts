import type { ForecastResponse } from '@/types/weather'

/**
 * The forecast model only reaches ~15 days, so the last requested day comes back with null
 * temperatures, precipitation and weather code. Drop trailing days with no data (from the daily and
 * hourly series alike) so they never render as zeros. Detection is by the data itself, so a fully
 * populated last day is kept. Gaps in the middle are left alone.
 */
export function trimEmptyTrailingDays(forecast: ForecastResponse): ForecastResponse {
  const { daily, hourly } = forecast
  const max = daily.temperature_2m_max
  if (!max) return forecast

  let keep = daily.time.length
  while (keep > 0 && max[keep - 1] == null) keep--
  if (keep === daily.time.length) return forecast

  const cut = new Set(daily.time.slice(keep))
  const hourIdx = hourly.time.flatMap((t, i) => (cut.has(t.slice(0, 10)) ? [] : [i]))
  // Every series in daily/hourly is an array aligned with `time`, so cut them all the same way.
  const pick = <T extends object>(obj: T, idx: number[] | null, n: number): T =>
    Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        Array.isArray(v) ? (idx ? idx.map((i) => v[i]) : v.slice(0, n)) : v,
      ]),
    ) as T

  return {
    ...forecast,
    daily: pick(daily, null, keep),
    hourly: pick(hourly, hourIdx, 0),
  }
}
