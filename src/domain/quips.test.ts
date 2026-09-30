import { describe, expect, it } from 'vitest'
import { BEERS, getBeer } from '../data/beers'
import { COPY } from '../data/copy'
import { bankQuip, quipAfterRating } from './quips'
import type { Rating, Ratings } from './types'

const R = (entries: [string, Rating][]): Ratings => Object.fromEntries(entries.map(([id, rating], i) => [id, { rating, at: i }]))

describe('quip bank', () => {
  it('has at least 10 lines per rating', () => {
    for (const list of Object.values(COPY.quips)) expect(list.length).toBeGreaterThanOrEqual(10)
  })

  it('never repeats within 10 consecutive swipes of the same rating', () => {
    for (const rating of Object.keys(COPY.quips) as Rating[]) {
      const lines = Array.from({ length: 10 }, (_, i) => bankQuip(rating, i + 1, 'X'))
      expect(new Set(lines).size, rating).toBe(10)
    }
  })

  it('10 LIKEs in a row produce 10 different toasts', () => {
    // pick plain beers so no special moment interferes
    const plain = BEERS.filter((b) => !b.style.includes('Weißbier') && !b.tags.includes('alkoholfrei')).slice(0, 10)
    let before: Ratings = {}
    const seen: string[] = []
    for (const beer of plain) {
      seen.push(quipAfterRating({ rating: 'LIKE', beer, before }))
      before = { ...before, [beer.id]: { rating: 'LIKE', at: seen.length } }
    }
    const repeats = seen.filter((q, i) => seen.indexOf(q) !== i)
    expect(repeats).toEqual([])
  })
})

describe('special moments', () => {
  it('first Weißbier LIKE', () => {
    expect(quipAfterRating({ rating: 'LIKE', beer: getBeer('erdinger'), before: R([['jever', 'LIKE']]) })).toBe(COPY.milestones.firstWeizenLike)
    // second time it is just a normal quip
    const again = quipAfterRating({ rating: 'LIKE', beer: getBeer('franziskaner'), before: R([['erdinger', 'LIKE']]) })
    expect(again).not.toBe(COPY.milestones.firstWeizenLike)
  })

  it('first rejected Kultbier', () => {
    expect(quipAfterRating({ rating: 'DISLIKE', beer: getBeer('augustiner'), before: R([['jever', 'LIKE']]) })).toBe(COPY.milestones.firstCultNope)
  })

  it('round numbers win over the bank', () => {
    const before = R(BEERS.slice(0, 19).map((b) => [b.id, 'KNOW' as Rating]))
    const beer = BEERS[25]
    expect(quipAfterRating({ rating: 'KNOW', beer, before })).toBe(COPY.milestones.total[20])
  })

  it('persona line every 7th swipe once there is a persona', () => {
    // 21st swipe: past the 50 % and 100 % moments, no round-number milestone
    const before = R(BEERS.slice(0, 20).map((b) => [b.id, 'KNOW' as Rating]))
    const q = quipAfterRating({ rating: 'KNOW', beer: BEERS[40], before, archetype: 'herb' })
    expect(COPY.quipsByArchetype.herb).toContain(q)
  })

  it('is deterministic', () => {
    const ctx = { rating: 'LIKE' as Rating, beer: getBeer('veltins'), before: R([['jever', 'LIKE']]) }
    expect(quipAfterRating(ctx)).toBe(quipAfterRating(ctx))
  })
})
