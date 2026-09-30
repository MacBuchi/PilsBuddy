import { describe, expect, it } from 'vitest'
import { COPY } from '../data/copy'
import { buildAvatar } from './avatar'
import { computeDNA } from './dna'
import { rankCandidates } from './matching'
import { shareCardData } from './shareCard'
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
})
