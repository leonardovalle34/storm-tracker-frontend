import { describe, expect, it } from 'vitest'
import {
  classifyWeather,
  scoreDiving,
  scoreHour,
  scoreKiteWindsurf,
  scoreLabel,
  scoreSurf,
  scoreSwimming,
} from './activityScorer'

describe('classifyWeather', () => {
  it.each([
    [0, 'sunny'],
    [1, 'sunny'],
    [2, 'cloudy'],
    [3, 'cloudy'],
    [45, 'cloudy'], // fog: not rain
    [51, 'rainy'],
    [63, 'rainy'],
    [82, 'rainy'],
    [86, 'rainy'], // snow showers count as precipitation
    [95, 'stormy'],
    [99, 'stormy'],
  ])('WMO %s is %s', (code, cat) => {
    expect(classifyWeather(code)).toBe(cat)
  })
})

// wind FROM north (0°) against a swell FROM south (180°) is offshore; both from 180° is onshore.
describe('scoreSurf(windDir, windKt, swellDir, swellPeriod, waveHeight)', () => {
  it('ideal: offshore, light wind, long period, 1.5 m', () => {
    expect(scoreSurf(0, 5, 180, 12, 1.5)).toBe(95)
  })

  it('bad: onshore, strong wind, short period, tiny waves', () => {
    expect(scoreSurf(180, 25, 180, 4, 0.2)).toBe(0)
  })

  it('offshore beats cross beats onshore, all else equal', () => {
    const [off, cross, on] = [0, 90, 180].map((w) => scoreSurf(w, 12, 180, 8, 1.5))
    expect(off).toBeGreaterThan(cross)
    expect(cross).toBeGreaterThan(on)
  })

  it('swell period: >10 s rewards, <6 s penalizes, in between is neutral', () => {
    const at = (p: number) => scoreSurf(90, 12, 180, p, 1.5)
    expect(at(11)).toBeGreaterThan(at(10))
    expect(at(10)).toBe(at(6))
    expect(at(5.9)).toBeLessThan(at(6))
  })

  it('wind: <8 kt gets a small bonus, >20 kt is penalized', () => {
    const at = (w: number) => scoreSurf(90, w, 180, 8, 1.5)
    expect(at(7)).toBeGreaterThan(at(8))
    expect(at(8)).toBe(at(20))
    expect(at(21)).toBeLessThan(at(20))
  })

  it('wave height: 0.4-3 m is the ideal range; outside it is penalized strongly', () => {
    const at = (h: number) => scoreSurf(0, 5, 180, 12, h)
    expect(at(0.4)).toBe(at(3))
    expect(at(0.3)).toBeLessThanOrEqual(at(1.5) - 40)
    expect(at(3.5)).toBeLessThanOrEqual(at(1.5) - 40)
  })

  it('stays within 0-100', () => {
    for (const w of [0, 90, 180])
      for (const h of [0, 1.5, 8]) {
        const s = scoreSurf(w, 40, 180, 3, h)
        expect(s).toBeGreaterThanOrEqual(0)
        expect(s).toBeLessThanOrEqual(100)
      }
    expect(scoreSurf(0, 0, 180, 20, 1.5)).toBeLessThanOrEqual(100)
  })
})

describe('scoreKiteWindsurf(windKt)', () => {
  it('ideal: 15-25 kt scores 85+ and peaks around 20 kt', () => {
    expect(scoreKiteWindsurf(15)).toBeGreaterThanOrEqual(85)
    expect(scoreKiteWindsurf(25)).toBeGreaterThanOrEqual(85)
    expect(scoreKiteWindsurf(20)).toBe(100)
  })

  it('bad: below 12 kt is weak (<30 at 11 kt, ~0 with no wind)', () => {
    expect(scoreKiteWindsurf(0)).toBe(0)
    expect(scoreKiteWindsurf(6)).toBeLessThan(30)
    expect(scoreKiteWindsurf(11)).toBeLessThan(30)
  })

  it('bad: above 35 kt is advanced/risky and low', () => {
    expect(scoreKiteWindsurf(40)).toBeLessThan(35)
    expect(scoreKiteWindsurf(50)).toBeLessThan(scoreKiteWindsurf(40))
    expect(scoreKiteWindsurf(70)).toBe(0)
  })

  it('intermediate bands are moderate', () => {
    expect(scoreKiteWindsurf(13)).toBeGreaterThan(scoreKiteWindsurf(11))
    expect(scoreKiteWindsurf(13)).toBeLessThan(85)
    expect(scoreKiteWindsurf(30)).toBe(60)
  })

  it('rises up to the ideal band and falls after it', () => {
    for (let w = 1; w <= 20; w++)
      expect(scoreKiteWindsurf(w)).toBeGreaterThanOrEqual(scoreKiteWindsurf(w - 1))
    for (let w = 21; w <= 60; w++) expect(scoreKiteWindsurf(w)).toBeLessThanOrEqual(scoreKiteWindsurf(w - 1))
  })
})

describe('scoreSwimming(windKt, waveHeight, weather)', () => {
  it('ideal: calm, flat, sunny = 100', () => {
    expect(scoreSwimming(5, 0.3, 'sunny')).toBe(100)
  })

  it('bad: strong wind, big waves, rain', () => {
    expect(scoreSwimming(25, 2, 'rainy')).toBe(0)
  })

  it('penalizes wind above 12 kt', () => {
    expect(scoreSwimming(12, 0.3, 'sunny')).toBe(100)
    expect(scoreSwimming(13, 0.3, 'sunny')).toBe(96)
  })

  it('penalizes waves above 1 m', () => {
    expect(scoreSwimming(5, 1, 'sunny')).toBe(100)
    expect(scoreSwimming(5, 1.5, 'sunny')).toBe(80)
  })

  it('penalizes rain; a storm scores 0; clouds do not', () => {
    expect(scoreSwimming(5, 0.3, 'rainy')).toBe(70)
    expect(scoreSwimming(5, 0.3, 'stormy')).toBe(0)
    expect(scoreSwimming(5, 0.3, 'cloudy')).toBe(100)
  })
})

describe('scoreDiving(windKt, waveHeight, weather)', () => {
  it('ideal: calm, flat, sunny = 100 (sun is a bonus)', () => {
    expect(scoreDiving(3, 0.2, 'sunny')).toBe(100)
    expect(scoreDiving(3, 0.2, 'cloudy')).toBe(80)
  })

  it('bad: wind, waves and rain together', () => {
    expect(scoreDiving(20, 2, 'rainy')).toBe(0)
  })

  it('penalizes wind above 10 kt', () => {
    expect(scoreDiving(10, 0.2, 'sunny')).toBe(100)
    expect(scoreDiving(12, 0.2, 'sunny')).toBe(90)
  })

  it('penalizes waves above 0.8 m', () => {
    expect(scoreDiving(3, 0.8, 'sunny')).toBe(100)
    expect(scoreDiving(3, 1, 'sunny')).toBe(90)
  })

  it('rain hurts visibility; storm scores 0', () => {
    expect(scoreDiving(3, 0.2, 'rainy')).toBe(45)
    expect(scoreDiving(3, 0.2, 'stormy')).toBe(0)
  })
})

describe('scoreLabel', () => {
  it.each([
    [100, 'great'],
    [75, 'great'],
    [74, 'good'],
    [55, 'good'],
    [54, 'fair'],
    [35, 'fair'],
    [34, 'poor'],
    [0, 'poor'],
  ])('score %s is %s', (s, label) => {
    expect(scoreLabel(s)).toBe(label)
  })
})

describe('scoreHour — safety rule runs before any scoring', () => {
  const perfect = { windDir: 0, windKt: 5, swellDir: 180, swellPeriod: 12, waveHeight: 1, weatherCode: 0 }

  it('scores the perfect hour well on every activity', () => {
    const r = scoreHour(perfect)
    expect(r.stormy).toBe(false)
    expect(r.scores.surf).toBeGreaterThanOrEqual(85)
    expect(r.scores.kite).toBeLessThan(30) // 5 kt is too light for kite; each activity has its own logic
    expect(r.scores.swimming).toBe(100)
    expect(r.scores.diving).toBe(90) // 1 m waves are just above the 0.8 m diving comfort limit
  })

  it.each([95, 96, 99])('WMO %s (thunderstorm) zeroes ALL activities, whatever the conditions', (code) => {
    const r = scoreHour({ ...perfect, windKt: 20, weatherCode: code })
    expect(r.stormy).toBe(true)
    expect(r.scores).toEqual({ surf: 0, kite: 0, swimming: 0, diving: 0 })
  })

  it('a storm zeroes everything even when other inputs are missing', () => {
    const r = scoreHour({
      windDir: null,
      windKt: null,
      swellDir: null,
      swellPeriod: null,
      waveHeight: null,
      weatherCode: 96,
    })
    expect(r.scores).toEqual({ surf: 0, kite: 0, swimming: 0, diving: 0 })
  })

  it('missing inputs give null (no data) only for the activities that need them', () => {
    const r = scoreHour({ ...perfect, swellDir: null, swellPeriod: null })
    expect(r.scores.surf).toBeNull()
    expect(r.scores.kite).not.toBeNull()
    expect(r.scores.swimming).not.toBeNull()
    const noWave = scoreHour({ ...perfect, waveHeight: null })
    expect(noWave.scores.surf).toBeNull()
    expect(noWave.scores.swimming).toBeNull()
    expect(noWave.scores.diving).toBeNull()
    expect(noWave.scores.kite).not.toBeNull()
    expect(scoreHour({ ...perfect, windKt: null }).scores.kite).toBeNull()
  })

  it('unknown weather is treated as neutral (cloudy)', () => {
    expect(scoreHour({ ...perfect, weatherCode: null }).scores.diving).toBe(70)
  })

  it('rain lowers swimming and diving but not surf or kite', () => {
    const dry = scoreHour({ ...perfect, windKt: 18 })
    const wet = scoreHour({ ...perfect, windKt: 18, weatherCode: 63 })
    expect(wet.scores.swimming).toBeLessThan(dry.scores.swimming!)
    expect(wet.scores.diving).toBeLessThan(dry.scores.diving!)
    expect(wet.scores.surf).toBe(dry.scores.surf)
    expect(wet.scores.kite).toBe(dry.scores.kite)
  })
})
