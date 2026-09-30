import { describe, expect, it } from 'vitest'
import { BEER_BY_ID, DECK_ORDER, getBeer } from '../data/beers'
import { NEUTRAL_VECTOR } from './dna'
import { buddyMatch, compatibility, matchReason, rankCandidates, tasteSimilarity } from './matching'
import type { Ratings, TasteVector } from './types'

const vec = (v: Partial<TasteVector>): TasteVector => ({ ...NEUTRAL_VECTOR, ...v })

describe('compatibility', () => {
  it('is 99 for an identical vector and never below 48', () => {
    const jever = getBeer('jever').taste
    expect(compatibility(jever, jever)).toBe(99)
    const opposite = vec({ bitterness: 0, hopIntensity: 0, dryness: 0, character: 0, sweetness: 100, drinkability: 100 })
    expect(compatibility(opposite, jever)).toBeGreaterThanOrEqual(48)
  })
  it('is reproducible', () => {
    const u = vec({ bitterness: 80 })
    expect(compatibility(u, getBeer('flensburger').taste)).toBe(compatibility(u, getBeer('flensburger').taste))
  })
  it('prefers the closer beer', () => {
    const u = vec({ bitterness: 90, dryness: 90 })
    expect(compatibility(u, getBeer('jever').taste)).toBeGreaterThan(compatibility(u, getBeer('leffe').taste))
  })
})

describe('rankCandidates', () => {
  const bitterFan = vec({ bitterness: 90, dryness: 90, hopIntensity: 70, character: 85, sweetness: 15 })
  it('excludes rated beers and sorts by pct desc', () => {
    const ratings: Ratings = { jever: { rating: 'LIKE', at: 1 } }
    const c = rankCandidates(bitterFan, ratings)
    expect(c.find((x) => x.beer.id === 'jever')).toBeUndefined()
    expect(c.length).toBe(DECK_ORDER.length - 1)
    for (let i = 1; i < c.length; i++) expect(c[i - 1].pct).toBeGreaterThanOrEqual(c[i].pct)
    expect(c[0].beer.id).toBe('flensburger')
  })
  it('falls back to WANT_TO_TRY/UNKNOWN when everything is rated', () => {
    const ratings: Ratings = Object.fromEntries(DECK_ORDER.map((id) => [id, { rating: 'LIKE' as const, at: 1 }]))
    ratings.urquell = { rating: 'WANT_TO_TRY', at: 1 }
    const c = rankCandidates(bitterFan, ratings)
    expect(c.map((x) => x.beer.id)).toEqual(['urquell'])
  })
  it('falls back to everything as a last resort', () => {
    const ratings: Ratings = Object.fromEntries(DECK_ORDER.map((id) => [id, { rating: 'LIKE' as const, at: 1 }]))
    expect(rankCandidates(bitterFan, ratings).length).toBe(DECK_ORDER.length)
  })
})

describe('matchReason', () => {
  it('names the shared strong axes', () => {
    const u = vec({ bitterness: 90, dryness: 90 })
    expect(matchReason(u, BEER_BY_ID.jever)).toContain('herbem')
    expect(matchReason(u, BEER_BY_ID.jever)).toContain('trockenem')
  })
  it('falls back when nothing overlaps', () => {
    expect(matchReason(NEUTRAL_VECTOR, BEER_BY_ID.jever)).toBe('Wir haben da so ein Gefühl. Vertrau uns einfach.')
  })
})

describe('social matching (prepared)', () => {
  it('cosine similarity is 1 for identical vectors', () => {
    expect(tasteSimilarity(NEUTRAL_VECTOR, NEUTRAL_VECTOR)).toBeCloseTo(1)
  })
  it('finds shared likes and disagreements', () => {
    const a = { taste: vec({ bitterness: 80 }), ratings: { jever: { rating: 'LIKE', at: 1 }, becks: { rating: 'LIKE', at: 1 } } as Ratings }
    const b = { taste: vec({ bitterness: 75 }), ratings: { jever: { rating: 'LIKE', at: 1 }, becks: { rating: 'DISLIKE', at: 1 } } as Ratings }
    const m = buddyMatch(a, b)
    expect(m.shared).toEqual(['jever'])
    expect(m.disagree).toEqual(['becks'])
    expect(m.pct).toBeGreaterThan(50)
    expect(m.pct).toBeLessThanOrEqual(99)
  })
})
