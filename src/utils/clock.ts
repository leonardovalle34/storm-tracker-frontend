/**
 * "HH:MM" from an ISO local time ("YYYY-MM-DDTHH:MM"), cut straight from the string: the backend already
 * sends it in the point's own timezone (timezone=auto), so no Date or timezone conversion. null when the
 * value is missing or not in that shape, so callers can skip rendering instead of showing garbage.
 */
export function formatClockTime(iso?: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)) return null
  return iso.slice(11, 16)
}
