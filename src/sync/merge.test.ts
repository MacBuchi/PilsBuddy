import { describe, expect, it } from 'vitest'
import { mergeRatings } from './merge'
import type { RemoteRatings } from './merge'
import type { Ratings } from '../domain/types'

const NOW = 10_000

describe('mergeRatings', () => {
  it('first sync of a fresh device uploads everything', () => {
    const local: Ratings = { jever: { rating: 'LIKE', at: 1 }, becks: { rating: 'DISLIKE', at: 2 } }
    const r = mergeRatings(local, {}, {}, NOW)
    expect(r.ratings).toEqual(local)
    expect(r.upsert).toEqual(local)
    expect(r.remove).toEqual([])
    expect(r.base).toEqual(local)
  })

  it('a second device gets the cloud ratings', () => {
    const remote: RemoteRatings = { jever: { rating: 'LIKE', at: 1, deleted: false } }
    const r = mergeRatings({}, remote, {}, NOW)
    expect(r.ratings).toEqual({ jever: { rating: 'LIKE', at: 1 } })
    expect(r.upsert).toEqual({})
  })

  it('nothing changed → nothing to write', () => {
    const local: Ratings = { jever: { rating: 'LIKE', at: 1 } }
    const r = mergeRatings(local, { jever: { rating: 'LIKE', at: 1, deleted: false } }, local, NOW)
    expect(r.upsert).toEqual({})
    expect(r.remove).toEqual([])
  })

  it('a local undo becomes a tombstone', () => {
    const base: Ratings = { jever: { rating: 'LIKE', at: 1 } }
    const r = mergeRatings({}, { jever: { rating: 'LIKE', at: 1, deleted: false } }, base, NOW)
    expect(r.ratings).toEqual({})
    expect(r.remove).toEqual(['jever'])
  })

  it('a removal on another device reaches this one', () => {
    const base: Ratings = { jever: { rating: 'LIKE', at: 1 } }
    const r = mergeRatings(base, { jever: { rating: 'LIKE', at: 5, deleted: true } }, base, NOW)
    expect(r.ratings).toEqual({})
    expect(r.upsert).toEqual({})
    expect(r.remove).toEqual([])
  })

  it('undo that restores an older rating still wins over the unchanged cloud', () => {
    const base: Ratings = { jever: { rating: 'DISLIKE', at: 9, previous: 'LIKE' } }
    const local: Ratings = { jever: { rating: 'LIKE', at: 1 } }
    const r = mergeRatings(local, { jever: { rating: 'DISLIKE', at: 9, previous: 'LIKE', deleted: false } }, base, NOW)
    expect(r.ratings.jever).toEqual({ rating: 'LIKE', at: 1 })
    expect(r.upsert.jever).toEqual({ rating: 'LIKE', at: 1 })
  })

  it('both changed: the newer rating wins, ties go to this device', () => {
    const base: Ratings = { jever: { rating: 'UNKNOWN', at: 1 } }
    const remote: RemoteRatings = { jever: { rating: 'LIKE', at: 7, deleted: false } }
    expect(mergeRatings({ jever: { rating: 'DISLIKE', at: 5 } }, remote, base, NOW).ratings.jever.rating).toBe('LIKE')
    expect(mergeRatings({ jever: { rating: 'DISLIKE', at: 8 } }, remote, base, NOW).ratings.jever.rating).toBe('DISLIKE')
    expect(mergeRatings({ jever: { rating: 'DISLIKE', at: 7 } }, remote, base, NOW).ratings.jever.rating).toBe('DISLIKE')
  })

  it('a local removal counts as now against an older remote change', () => {
    const base: Ratings = { jever: { rating: 'UNKNOWN', at: 1 } }
    const r = mergeRatings({}, { jever: { rating: 'LIKE', at: 7, deleted: false } }, base, NOW)
    expect(r.ratings).toEqual({})
    expect(r.remove).toEqual(['jever'])
  })

  it('joining an account merges both sides without losing beers', () => {
    const local: Ratings = { becks: { rating: 'DISLIKE', at: 3 }, jever: { rating: 'KNOW', at: 2 } }
    const remote: RemoteRatings = { jever: { rating: 'LIKE', at: 4, deleted: false }, guinness: { rating: 'LIKE', at: 1, deleted: false } }
    const r = mergeRatings(local, remote, {}, NOW)
    expect(Object.keys(r.ratings).sort()).toEqual(['becks', 'guinness', 'jever'])
    expect(r.ratings.jever.rating).toBe('LIKE')
    expect(Object.keys(r.upsert)).toEqual(['becks'])
  })

  it('a tombstone that is later re-rated comes back', () => {
    const r = mergeRatings({ jever: { rating: 'LIKE', at: 9 } }, { jever: { rating: 'LIKE', at: 5, deleted: true } }, {}, NOW)
    expect(r.ratings.jever.rating).toBe('LIKE')
    expect(r.upsert.jever).toEqual({ rating: 'LIKE', at: 9 })
  })
})
