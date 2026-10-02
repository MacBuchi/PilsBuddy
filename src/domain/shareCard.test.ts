import { describe, expect, it } from 'vitest'
import { COPY } from '../data/copy'
import { buildAvatar } from './avatar'
import { computeDNA } from './dna'
import { rankCandidates } from './matching'
import { toRegionalBeer } from './regionalBeer'
import { shareCardData } from './shareCard'
import { BEER_BY_ID } from '../data/beers'
import type { Ratings } from './types'

const make = (ratings: Ratings) => {
  const dna = computeDNA(ratings)
  return shareCardData(dna, 'herb', buildAvatar('herb', dna.decoded), ratings, rankCandidates(dna.taste, ratings).slice(0, 3))
}

describe('shareCardData', () => {
  it('shows the persona, five DNA bars and up to three liked beers, best fit first', () => {
    const ratings: Ratings = {
      jever: { rating: 'LIKE', at: 1 },
      flensburger: { rating: 'LIKE', at: 2 },
      augustiner: { rating: 'LIKE', at: 3 },
      guinness: { rating: 'LIKE', at: 4 },
      becks: { rating: 'DISLIKE', at: 5 },
    }
    const d = make(ratings)
    expect(d.persona).toBe(COPY.personas.herb.name)
    expect(d.bars).toHaveLength(5)
    expect(d.bars.every((b) => b.value >= 0 && b.value <= 100)).toBe(true)
    expect(d.top).toHaveLength(3)
    expect(d.top[0].pct).toBeGreaterThanOrEqual(d.top[1].pct)
    expect(d.top.map((t) => t.name)).not.toContain("Beck's")
    expect(d.topLabel).toBe(COPY.share.topLiked)
  })

  it('falls back to recommendations when nothing is liked', () => {
    const d = make({ becks: { rating: 'DISLIKE', at: 1 } })
    expect(d.top).toHaveLength(3)
    expect(d.topLabel).toBe(COPY.share.topNext)
  })

  it('names the best-fitting regional beer with a heart (R5), none without one', () => {
    const brewery = { id: 'osm-n1', name: 'Löwenbräu Hintertupfing', lat: 49.2, lon: 9.1, city: null, postcode: null, country: 'DE' as const, website: null, founded: null }
    const row = (id: string, name: string, style: string) => ({ id, name, style, abv: null, pack: null, rank: 0, source: 1, source_ref: null })
    const pils = toRegionalBeer(row('r-pils', 'Tupfinger Pils', 'Pils'), brewery)
    const bock = toRegionalBeer(row('r-bock', 'Tupfinger Bock', 'Doppelbock'), brewery)
    const lookup = { ...BEER_BY_ID, [pils.id]: pils, [bock.id]: bock }
    const ratings: Ratings = { jever: { rating: 'LIKE', at: 1 }, 'r-pils': { rating: 'LIKE', at: 2 }, 'r-bock': { rating: 'LIKE', at: 3 } }
    const dna = computeDNA(ratings, lookup)
    const d = shareCardData(dna, 'herb', buildAvatar('herb', dna.decoded), ratings, [], lookup)
    expect(d.regional).toBe('Tupfinger Pils · Löwenbräu Hintertupfing')
    expect(make({ jever: { rating: 'LIKE', at: 1 } }).regional).toBeNull()
  })
})
