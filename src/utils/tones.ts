/** Four-step status scale, reusing the wind intensity token pairs (AA-checked in both themes). */
export type Tone = 'good' | 'ok' | 'warn' | 'bad'

export const TONE_CLASS: Record<Tone, string> = {
  good: 'bg-wind-calm text-wind-calm-fg',
  ok: 'bg-wind-moderate text-wind-moderate-fg',
  warn: 'bg-wind-strong text-wind-strong-fg',
  bad: 'bg-wind-extreme text-wind-extreme-fg',
}
