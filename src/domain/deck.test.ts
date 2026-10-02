import { describe, expect, it } from 'vitest'
import { BEERS, BEER_BY_ID, DECK_ORDER, REFERENCE_COUNT, getBeer } from '../data/beers'
import { DECODE_TARGET } from './dna'
import { buildDeck, isRegionalId } from './deck'
import { toRegionalBeer } from './regionalBeer'
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

describe('Regional-Modus (R5)', () => {
  const brewery = { id: 'osm-n1', name: 'Löwenbräu Hintertupfing', lat: 49.2, lon: 9.1, city: 'Hintertupfing', postcode: '74906', country: 'DE' as const, website: null, founded: null }
  const row = (id: string, style: string) => ({ id, name: `Hiesiges ${style}`, style, abv: null, pack: null, rank: 0, source: 1, source_ref: null })
  const nearby = [
    { beer: toRegionalBeer(row('r-pils', 'Pils'), brewery), km: 12 },
    { beer: toRegionalBeer(row('r-dunkel', 'Dunkles'), brewery), km: 3 },
    { beer: toRegionalBeer(row('r-weizen', 'Weißbier'), brewery), km: 30 },
  ]
  const lookup = { ...BEER_BY_ID, ...Object.fromEntries(nearby.map((n) => [n.beer.id, n.beer])) }
  const afterOnboarding = rate(referenceIds)

  it('every third card is regional; the own cards keep their order (reference set first)', () => {
    const deck = buildDeck({}, DECK_ORDER, lookup, nearby)
    expect(deck.slice(0, 9).map((c) => c.pick === 'regional')).toEqual([false, false, true, false, false, true, false, false, true])
    const own = deck.filter((c) => c.pick !== 'regional')
    expect(own).toEqual(buildDeck({}))
    expect(deck).toHaveLength(BEERS.length + nearby.length)
  })

  it('orders regional cards by match, carries pct and distance', () => {
    const regional = buildDeck(afterOnboarding, DECK_ORDER, lookup, nearby).filter((c) => c.pick === 'regional')
    expect(regional.map((c) => c.pct)).toEqual([...regional.map((c) => c.pct!)].sort((a, b) => b - a))
    expect(regional.find((c) => c.id === 'r-dunkel')?.km).toBe(3)
  })

  it('keeps its rhythm while the deck is rebuilt after each swipe', () => {
    let ratings: Ratings = { ...afterOnboarding }
    const seen: string[] = []
    for (let i = 0; i < 9; i++) {
      const top = buildDeck(ratings, DECK_ORDER, lookup, nearby)[0]
      seen.push(top.pick)
      ratings = { ...ratings, [top.id]: { rating: 'KNOW', at: 1000 + i } }
    }
    const at = seen.flatMap((p, i) => (p === 'regional' ? [i] : []))
    expect(at).toHaveLength(3)
    expect(at[1] - at[0]).toBe(3)
    expect(at[2] - at[1]).toBe(3)
  })

  it('skips rated or duplicate nearby beers, and is a no-op without them', () => {
    const deck = buildDeck({ 'r-pils': { rating: 'LIKE', at: 1 } }, DECK_ORDER, lookup, [...nearby, nearby[1]])
    expect(deck.filter((c) => c.pick === 'regional').map((c) => c.id).sort()).toEqual(['r-dunkel', 'r-weizen'])
    expect(buildDeck(afterOnboarding, DECK_ORDER, lookup, [])).toEqual(buildDeck(afterOnboarding))
  })

  it('no curated id looks regional', () => {
    expect(DECK_ORDER.filter(isRegionalId)).toEqual([])
  })
})
