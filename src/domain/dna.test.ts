import { describe, expect, it } from 'vitest'
import { computeCuriosity, computeDNA, computeTasteVector, countRatings, decodedPercent, NEUTRAL_VECTOR } from './dna'
import type { Beer, Ratings, TasteVector } from './types'

const vec = (v: Partial<TasteVector>): TasteVector => ({ ...NEUTRAL_VECTOR, ...v })
const beer = (id: string, taste: Partial<TasteVector>): Beer => ({
  id,
  name: id,
  fullName: id,
  brewery: '',
  country: '',
  region: '',
  abv: 5,
  style: 'Pils',
  taste: vec(taste),
  description: '',
  humorousBio: '',
  tags: [],
  color: '#fff',
})

const LOOKUP = {
  bitter: beer('bitter', { bitterness: 95, dryness: 90 }),
  sweet: beer('sweet', { bitterness: 10, sweetness: 90 }),
  hoppy: beer('hoppy', { hopIntensity: 95 }),
}

const r = (entries: Record<string, Ratings[string]['rating']>): Ratings =>
  Object.fromEntries(Object.entries(entries).map(([id, rating]) => [id, { rating, at: 1 }]))

describe('countRatings / decodedPercent', () => {
  it('counts every rating kind', () => {
    const c = countRatings(r({ a: 'LIKE', b: 'DISLIKE', c: 'UNKNOWN', d: 'KNOW', e: 'WANT_TO_TRY', f: 'LIKE' }))
    expect(c).toEqual({ LIKE: 2, DISLIKE: 1, UNKNOWN: 1, KNOW: 1, WANT_TO_TRY: 1, total: 6 })
  })
  it('decoded caps at 100', () => {
    expect(decodedPercent(0)).toBe(0)
    expect(decodedPercent(7)).toBe(50)
    expect(decodedPercent(14)).toBe(100)
    expect(decodedPercent(40)).toBe(100)
  })
})

describe('computeTasteVector', () => {
  it('is neutral with no ratings', () => {
    expect(computeTasteVector({}, LOOKUP)).toEqual(NEUTRAL_VECTOR)
  })
  it('LIKE pulls towards the beer', () => {
    const t = computeTasteVector(r({ bitter: 'LIKE' }), LOOKUP)
    expect(t.bitterness).toBeGreaterThan(85)
    expect(t.dryness).toBeGreaterThan(85)
  })
  it('DISLIKE pushes away from the beer', () => {
    const t = computeTasteVector(r({ bitter: 'DISLIKE' }), LOOKUP)
    expect(t.bitterness).toBeLessThan(40)
  })
  it('UNKNOWN has no influence at all', () => {
    expect(computeTasteVector(r({ bitter: 'UNKNOWN' }), LOOKUP)).toEqual(NEUTRAL_VECTOR)
    const withLike = computeTasteVector(r({ sweet: 'LIKE' }), LOOKUP)
    expect(computeTasteVector(r({ sweet: 'LIKE', bitter: 'UNKNOWN' }), LOOKUP)).toEqual(withLike)
  })
  it('KNOW is weaker than LIKE, WANT_TO_TRY in between', () => {
    const like = computeTasteVector(r({ sweet: 'LIKE', bitter: 'KNOW' }), LOOKUP).sweetness
    const know = computeTasteVector(r({ sweet: 'KNOW', bitter: 'LIKE' }), LOOKUP).sweetness
    const tryIt = computeTasteVector(r({ sweet: 'WANT_TO_TRY', bitter: 'LIKE' }), LOOKUP).sweetness
    expect(like).toBeGreaterThan(tryIt)
    expect(tryIt).toBeGreaterThan(know)
  })
  it('stays within 6–97 and is deterministic', () => {
    const ratings = r({ bitter: 'LIKE', hoppy: 'LIKE', sweet: 'DISLIKE' })
    const a = computeTasteVector(ratings, LOOKUP)
    const b = computeTasteVector(ratings, LOOKUP)
    expect(a).toEqual(b)
    for (const v of Object.values(a)) {
      expect(v).toBeGreaterThanOrEqual(6)
      expect(v).toBeLessThanOrEqual(97)
    }
  })
  it('ignores unknown beer ids', () => {
    expect(computeTasteVector(r({ ghost: 'LIKE' }), LOOKUP)).toEqual(NEUTRAL_VECTOR)
  })
})

describe('curiosity', () => {
  it('is 0 without ratings and grows with WANT_TO_TRY / UNKNOWN', () => {
    expect(computeCuriosity(countRatings({}))).toBe(0)
    const low = computeCuriosity(countRatings(r({ a: 'LIKE', b: 'DISLIKE', c: 'LIKE' })))
    const high = computeCuriosity(countRatings(r({ a: 'WANT_TO_TRY', b: 'UNKNOWN', c: 'WANT_TO_TRY' })))
    expect(high).toBeGreaterThan(low)
  })
  it('dislikes do not raise curiosity', () => {
    const base = computeCuriosity(countRatings(r({ a: 'WANT_TO_TRY', b: 'LIKE' })))
    const withNope = computeCuriosity(countRatings(r({ a: 'WANT_TO_TRY', b: 'LIKE', c: 'DISLIKE' })))
    expect(withNope).toBeLessThanOrEqual(base)
  })
})

describe('computeDNA', () => {
  it('bundles vector, curiosity, decoded and counts', () => {
    const d = computeDNA(r({ bitter: 'LIKE', sweet: 'UNKNOWN' }), LOOKUP)
    expect(d.counts.total).toBe(2)
    expect(d.decoded).toBe(14)
    expect(d.taste.bitterness).toBeGreaterThan(50)
    expect(d.curiosity).toBeGreaterThan(0)
  })
})
