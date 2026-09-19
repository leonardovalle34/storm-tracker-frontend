/** Formats a "YYYY-MM-DD" date as a short local weekday + day/month, with no timezone shifting. */
export function formatDay(date: string, locale: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(y, m - 1, d))
}
