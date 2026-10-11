import { describe, expect, it } from 'vitest'
import { BEERS } from '../data/beers'
import { favoriteRatings, MAX_FAVORITES, searchFavorites } from './favorites'

describe('V3 – favourites search', () => {
  it('puts the beer whose name starts with the query first', () => {
    const hits = searchFavorites(BEERS, 'jever')
    expect(hits[0].brewery).toMatch(/Jever/)
    expect(hits.every((b) => /jever/i.test(`${b.fullName} ${b.brewery}`))).toBe(true)
  })

  it('finds by brewery and ignores case and umlauts', () => {
    const a = searchFavorites(BEERS, 'augustiner')
    expect(a.length).toBeGreaterThan(0)
    expect(searchFavorites(BEERS, 'AUGUSTINER')).toEqual(a)
    const brau = searchFavorites(BEERS, 'augustiner brau')
    expect(brau.length).toBeGreaterThan(0)
    expect(searchFavorites(BEERS, 'Augustiner Bräu')).toEqual(brau)
  })

  it('needs two letters, caps the list, is deterministic', () => {
    expect(searchFavorites(BEERS, 'p')).toEqual([])
    expect(searchFavorites(BEERS, 'pils').length).toBeLessThanOrEqual(6)
    expect(searchFavorites(BEERS, 'pils')).toEqual(searchFavorites(BEERS, 'pils'))
    expect(searchFavorites(BEERS, 'xyzzy')).toEqual([])
  })
})

describe('V3 – favourites become „Mag ich“', () => {
  it('rates each once, at most five, never over an existing rating', () => {
    const ids = ['a', 'b', 'a', 'c', 'd', 'e', 'f', 'g']
    expect(favoriteRatings(ids, {})).toEqual(['a', 'b', 'c', 'd', 'e'].slice(0, MAX_FAVORITES))
    expect(favoriteRatings(['a', 'b'], { a: { rating: 'DISLIKE', at: 1 } })).toEqual(['b'])
  })
})
