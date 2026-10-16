import { describe, expect, it } from 'vitest'
import { formatClockTime } from './clock'

describe('formatClockTime', () => {
  it('cuts HH:MM from the local ISO string, with no timezone shift', () => {
    expect(formatClockTime('2026-09-19T05:50')).toBe('05:50')
    expect(formatClockTime('2026-09-19T18:07')).toBe('18:07')
    expect(formatClockTime('2026-12-31T23:59:30')).toBe('23:59')
  })

  it('returns null for a missing or malformed value', () => {
    expect(formatClockTime(undefined)).toBeNull()
    expect(formatClockTime(null)).toBeNull()
    expect(formatClockTime('')).toBeNull()
    expect(formatClockTime('2026-09-19')).toBeNull()
    expect(formatClockTime('garbage')).toBeNull()
  })
})
