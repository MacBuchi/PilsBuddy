import { describe, expect, it } from 'vitest'
import { computeDNA, NEUTRAL_VECTOR } from './dna'
import { archetypeFor } from './persona'
import type { BeerDNA, RatingCounts, Ratings, TasteVector } from './types'

const counts = (p: Partial<RatingCounts> = {}): RatingCounts => ({
  LIKE: 0,
  DISLIKE: 0,
  KNOW: 0,
  UNKNOWN: 0,
  WANT_TO_TRY: 0,
  total: 5,
  ...p,
})
const dna = (taste: Partial<TasteVector>, extra: Partial<BeerDNA> = {}): BeerDNA => ({
  taste: { ...NEUTRAL_VECTOR, ...taste },
  curiosity: 20,
  decoded: 50,
  counts: counts(),
  ...extra,
})

describe('archetypeFor', () => {
  it('is a riddle under 3 ratings', () => {
    expect(archetypeFor(dna({ bitterness: 99 }, { counts: counts({ total: 2 }) }))).toBe('logo')
  })
  it('curiosity wins first', () => {
    expect(archetypeFor(dna({}, { curiosity: 70 }))).toBe('probierer')
    expect(archetypeFor(dna({ hopIntensity: 70 }, { curiosity: 70 }))).toBe('abenteurer')
  })
  it('hops + character → Abenteurer', () => {
    expect(archetypeFor(dna({ hopIntensity: 80, character: 70 }))).toBe('abenteurer')
  })
  it('bitter + dry → Herbe', () => {
    expect(archetypeFor(dna({ bitterness: 80, dryness: 70 }))).toBe('herb')
  })
  it('malt + character → Philosoph', () => {
    expect(archetypeFor(dna({ maltiness: 80, character: 60 }))).toBe('philosoph')
  })
  it('knows most beers → Kasten-Kenner', () => {
    expect(archetypeFor(dna({}, { counts: counts({ KNOW: 3, total: 6 }) }))).toBe('kasten')
  })
  it('easy drinking, little character → Genießer, otherwise Feierabend', () => {
    expect(archetypeFor(dna({ drinkability: 80, character: 40 }))).toBe('geniesser')
    expect(archetypeFor(dna({}))).toBe('feierabend')
  })
  it('works end to end from real ratings', () => {
    const ratings: Ratings = {
      jever: { rating: 'LIKE', at: 1 },
      flensburger: { rating: 'LIKE', at: 1 },
      radeberger: { rating: 'LIKE', at: 1 },
      leffe: { rating: 'DISLIKE', at: 1 },
    }
    expect(archetypeFor(computeDNA(ratings))).toBe('herb')
  })
})
