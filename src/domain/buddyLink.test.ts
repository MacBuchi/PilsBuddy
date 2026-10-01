import { describe, expect, it } from 'vitest'
import { compareWithBuddy, decodeBuddy, encodeBuddy } from './buddyLink'
import type { Ratings } from './types'

const R = (o: Record<string, Ratings[string]['rating']>): Ratings => Object.fromEntries(Object.entries(o).map(([id, rating]) => [id, { rating, at: 123 }]))

describe('buddy link', () => {
  it('round-trips buddy number and ratings (timestamps are not shared)', () => {
    const ratings = R({ jever: 'LIKE', becks: 'DISLIKE', guinness: 'WANT_TO_TRY', corona: 'KNOW', schlenkerla: 'UNKNOWN' })
    const back = decodeBuddy(encodeBuddy(427, ratings))!
    expect(back.no).toBe(427)
    expect(Object.keys(back.ratings).sort()).toEqual(Object.keys(ratings).sort())
    expect(back.ratings.becks).toEqual({ rating: 'DISLIKE', at: 0 })
  })

  it('is URL-safe and compact', () => {
    const code = encodeBuddy(1, R({ jever: 'LIKE', 'paulaner-weisse': 'LIKE' }))
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(code.length).toBeLessThan(120)
  })

  it('rejects junk and drops unknown beers', () => {
    expect(decodeBuddy(null)).toBeNull()
    expect(decodeBuddy('%%%')).toBeNull()
    expect(decodeBuddy(btoa('{"v":2}'))).toBeNull()
    const onlyUnknown = encodeBuddy(5, R({ 'not-a-beer': 'LIKE' }))
    expect(decodeBuddy(onlyUnknown)).toBeNull()
    const mixed = decodeBuddy(encodeBuddy(5, R({ 'not-a-beer': 'LIKE', jever: 'LIKE' })))!
    expect(Object.keys(mixed.ratings)).toEqual(['jever'])
  })

  it('compares two people: shared likes, disagreements, tips', () => {
    const me = R({ jever: 'LIKE', becks: 'LIKE', guinness: 'WANT_TO_TRY' })
    const buddy = { no: 9, ratings: R({ jever: 'LIKE', becks: 'DISLIKE', guinness: 'LIKE', duvel: 'LIKE', corona: 'DISLIKE' }) }
    const c = compareWithBuddy(me, buddy)
    expect(c.shared).toEqual(['jever'])
    expect(c.disagree).toEqual(['becks'])
    expect(c.tips).toEqual(['duvel', 'guinness'])
    expect(c.pct).toBeGreaterThanOrEqual(0)
    expect(c.pct).toBeLessThanOrEqual(99)
    expect(compareWithBuddy(me, buddy)).toEqual(c)
  })
})
