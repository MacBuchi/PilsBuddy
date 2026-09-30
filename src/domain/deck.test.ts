import { describe, expect, it } from 'vitest'
import { BEERS, DECK_ORDER, REFERENCE_COUNT, getBeer } from '../data/beers'
import { DECODE_TARGET } from './dna'
import { buildDeck } from './deck'
import type { Rating, Ratings } from './types'

const rate = (ids: string[], rating: Rating = 'LIKE'): Ratings =>
  Object.fromEntries(ids.map((id, i) => [id, { rating, at: i }]))
const referenceIds = BEERS.filter((b) => b.reference).map((b) => b.id)

describe('reference set', () => {
  it('decodes the DNA exactly when the reference set is done', () => {
    expect(REFERENCE_COUNT).toBe(DECODE_TARGET)
  })

  it('covers every style family once during onboarding', () => {
    const styles = new Set(referenceIds.map((id) => getBeer(id).style))
    for (const s of ['Pils', 'Helles', 'Weißbier', 'Schwarzbier', 'Stout', 'IPA', 'Pale Ale', 'Lager', 'Doppelbock', 'Kölsch', 'Rauchbier', 'Belgian Strong Ale']) {
      expect(styles, s).toContain(s)
    }
  })

  it('every beer has a dislike quip', () => {
    expect(BEERS.filter((b) => !b.disLikeQuip).map((b) => b.id)).toEqual([])
  })

  it('beer ids are unique', () => {
    expect(new Set(DECK_ORDER).size).toBe(BEERS.length)
  })
})

describe('buildDeck', () => {
  it('starts with the unrated reference beers in fixed order', () => {
    const deck = buildDeck({})
    expect(deck.slice(0, REFERENCE_COUNT).map((c) => c.id)).toEqual(referenceIds)
    expect(deck.slice(0, REFERENCE_COUNT).every((c) => c.pick === 'reference')).toBe(true)
    expect(deck).toHaveLength(BEERS.length)
  })

  it('skips rated beers', () => {
    const deck = buildDeck(rate(['jever', 'guinness']))
    expect(deck.map((c) => c.id)).not.toContain('jever')
    expect(deck.map((c) => c.id)).not.toContain('guinness')
  })

  it('after onboarding: two "für dich", then one "mal was anderes"', () => {
    const deck = buildDeck(rate(referenceIds))
    expect(deck.slice(0, 6).map((c) => c.pick)).toEqual(['forYou', 'forYou', 'horizon', 'forYou', 'forYou', 'horizon'])
  })

  it('keeps the rhythm going as curated beers get rated', () => {
    const first = buildDeck(rate(referenceIds))
    const next = buildDeck({ ...rate(referenceIds), [first[0].id]: { rating: 'LIKE', at: 99 } })
    expect(next.slice(0, 2).map((c) => c.pick)).toEqual(['forYou', 'horizon'])
  })

  it('"für dich" fits better than "mal was anderes"', () => {
    const hopHead = { ...rate(referenceIds, 'DISLIKE'), ...rate(['jever', 'punk-ipa', 'ratsherrn']) }
    const deck = buildDeck(hopHead)
    const forYou = deck.filter((c) => c.pick === 'forYou')
    const horizon = deck.filter((c) => c.pick === 'horizon')
    expect(forYou[0].pct!).toBeGreaterThan(horizon[0].pct!)
    expect(Math.min(...forYou.slice(0, 4).map((c) => c.pct!))).toBeGreaterThanOrEqual(horizon[0].pct!)
  })

  it('is deterministic', () => {
    const r = rate([...referenceIds, 'warsteiner'])
    expect(buildDeck(r)).toEqual(buildDeck(r))
  })
})
