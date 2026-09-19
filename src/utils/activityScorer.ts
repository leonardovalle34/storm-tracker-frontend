/**
 * Aquatic activity scoring — a RULE-BASED HEURISTIC, not machine learning.
 *
 * Every function is a hand-written scoring rule: start from a base value, add bonuses and subtract
 * penalties for each condition, and clamp to 0-100. The thresholds below come from common surf/kite/
 * swim/dive rules of thumb, not from fitted data, so they are meant to be tuned by hand. No training,
 * no model, no learned weights.
 *
 * Safety rule, applied before any scoring (see scoreHour): a thunderstorm (WMO weather_code >= 95)
 * sets EVERY activity to 0, regardless of any other factor.
 *
 * Units: wind in knots, wave height in meters, swell period in seconds, directions in degrees
 * ("coming from" bearings, as the API returns them).
 */
import { windShoreType } from './windShore'

export type Activity = 'surf' | 'kite' | 'swimming' | 'diving'
export const ACTIVITIES: Activity[] = ['surf', 'kite', 'swimming', 'diving']
export type WeatherCategory = 'sunny' | 'cloudy' | 'rainy' | 'stormy'
export type ScoreLabel = 'great' | 'good' | 'fair' | 'poor'

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)))

/**
 * WMO weather_code -> category. 0-1 sunny, 2-3 cloudy, 51-82 rainy, 95+ stormy.
 * Codes the spec leaves out: 4-50 (fog etc.) count as cloudy; 83-94 (snow showers) as rainy.
 */
export function classifyWeather(code: number): WeatherCategory {
  if (code >= 95) return 'stormy'
  if (code >= 51) return 'rainy'
  if (code <= 1) return 'sunny'
  return 'cloudy'
}

/**
 * Surf. Base 50.
 *  wind vs. shore: offshore +25, cross +5, onshore -25
 *  swell period:   > 10 s +15, < 6 s -20
 *  wind speed:     < 8 kt +5, > 20 kt -20
 *  wave height:    outside 0.4-3 m -40
 */
export function scoreSurf(
  windDirection: number,
  windSpeedKnots: number,
  swellDirection: number,
  swellPeriod: number,
  waveHeight: number,
): number {
  let score = 50
  const shore = windShoreType(windDirection, swellDirection)
  score += shore === 'offshore' ? 25 : shore === 'cross' ? 5 : -25
  if (swellPeriod > 10) score += 15
  else if (swellPeriod < 6) score -= 20
  if (windSpeedKnots < 8) score += 5
  else if (windSpeedKnots > 20) score -= 20
  if (waveHeight < 0.4 || waveHeight > 3) score -= 40
  return clamp(score)
}

// [knots, score] anchor points, linearly interpolated: weak below 12 kt, ideal 15-25, risky above 35.
const KITE_CURVE: [number, number][] = [
  [0, 0],
  [8, 10],
  [12, 30],
  [15, 85],
  [20, 100],
  [25, 85],
  [35, 35],
  [45, 10],
  [60, 0],
]

/** Kite / windsurf depend on wind speed alone. */
export function scoreKiteWindsurf(windSpeedKnots: number): number {
  const last = KITE_CURVE[KITE_CURVE.length - 1]
  if (windSpeedKnots >= last[0]) return last[1]
  for (let i = 1; i < KITE_CURVE.length; i++) {
    const [x1, y1] = KITE_CURVE[i]
    if (windSpeedKnots <= x1) {
      const [x0, y0] = KITE_CURVE[i - 1]
      return clamp(y0 + ((windSpeedKnots - x0) / (x1 - x0)) * (y1 - y0))
    }
  }
  return 0
}

/** Swimming. Base 100; -4/kt above 12 kt; -40/m above 1 m; rain -30; storm = 0. */
export function scoreSwimming(windSpeedKnots: number, waveHeight: number, weather: WeatherCategory): number {
  if (weather === 'stormy') return 0
  let score = 100
  score -= Math.max(0, windSpeedKnots - 12) * 4
  score -= Math.max(0, waveHeight - 1) * 40
  if (weather === 'rainy') score -= 30
  return clamp(score)
}

/** Diving. Base 80; sunny +20; -5/kt above 10 kt; -50/m above 0.8 m; rain -35 (visibility); storm = 0. */
export function scoreDiving(windSpeedKnots: number, waveHeight: number, weather: WeatherCategory): number {
  if (weather === 'stormy') return 0
  let score = 80
  if (weather === 'sunny') score += 20
  score -= Math.max(0, windSpeedKnots - 10) * 5
  score -= Math.max(0, waveHeight - 0.8) * 50
  if (weather === 'rainy') score -= 35
  return clamp(score)
}

/** Qualitative band for a 0-100 score. */
export function scoreLabel(score: number): ScoreLabel {
  if (score >= 75) return 'great'
  if (score >= 55) return 'good'
  if (score >= 35) return 'fair'
  return 'poor'
}

export interface HourConditions {
  weatherCode: number | null
  windDir: number | null
  windKt: number | null
  swellDir: number | null
  swellPeriod: number | null
  waveHeight: number | null
}

export interface HourScores {
  /** true when weather_code >= 95: every score is 0 */
  stormy: boolean
  /** null = not enough data for that activity in this hour */
  scores: Record<Activity, number | null>
}

/** Scores one hour for all activities. The storm safety rule comes first and overrides everything. */
export function scoreHour(c: HourConditions): HourScores {
  if (c.weatherCode !== null && classifyWeather(c.weatherCode) === 'stormy') {
    return { stormy: true, scores: { surf: 0, kite: 0, swimming: 0, diving: 0 } }
  }
  const weather: WeatherCategory = c.weatherCode === null ? 'cloudy' : classifyWeather(c.weatherCode) // unknown = neutral
  const { windDir, windKt, swellDir, swellPeriod, waveHeight } = c
  return {
    stormy: false,
    scores: {
      surf:
        windDir !== null &&
        windKt !== null &&
        swellDir !== null &&
        swellPeriod !== null &&
        waveHeight !== null
          ? scoreSurf(windDir, windKt, swellDir, swellPeriod, waveHeight)
          : null,
      kite: windKt !== null ? scoreKiteWindsurf(windKt) : null,
      swimming: windKt !== null && waveHeight !== null ? scoreSwimming(windKt, waveHeight, weather) : null,
      diving: windKt !== null && waveHeight !== null ? scoreDiving(windKt, waveHeight, weather) : null,
    },
  }
}
