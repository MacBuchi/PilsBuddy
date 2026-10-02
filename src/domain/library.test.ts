import { describe, expect, it } from 'vitest'
import raw from '../data/beers.json'
import { abvBand, filterLibrary, fold, groupCounts, isPostcode, matchesQuery, NO_FILTER, STYLE_GROUPS, styleGroup } from './library'
import { STYLE_PROFILES } from './styleProfile'
import type { Beer, Ratings } from './types'

const beers = raw as Beer[]
const byId = (id: string) => beers.find((b) => b.id === id)!
const ids = (list: Beer[]) => list.map((b) => b.id)

describe('styleGroup', () => {
  it('puts every known style into a group', () => {
    const missing = Object.keys(STYLE_PROFILES).filter((style) => !styleGroup({ style, abv: 5 }))
    expect(missing).toEqual([])
  })

  it('every group has curated beers', () => {
    for (const g of STYLE_GROUPS) expect(beers.some((b) => styleGroup(b) === g), g).toBe(true)
  })

  it('alcohol-free wins over the style, an unknown style is in no group', () => {
    expect(styleGroup({ style: 'Pils', abv: 0.4 })).toBe('alkoholfrei')
    expect(styleGroup({ style: 'Weißbier', abv: 5.3 })).toBe('weizen')
    expect(styleGroup({ style: 'IPA', abv: 6 })).toBe('hopfen')
    expect(styleGroup({ style: 'Schwarzbier', abv: 4.8 })).toBe('dunkel')
    expect(styleGroup({ style: 'Bier', abv: 5 })).toBeNull()
  })
})

describe('search', () => {
  it('folds case, accents and ß', () => {
    expect(fold('Weißbier Bräu')).toBe('weissbier brau')
  })

  it('every word must appear in name, brewery, place or style', () => {
    const jever = byId('jever')
    expect(matchesQuery(jever, 'jever')).toBe(true)
    expect(matchesQuery(jever, '  JEVER  pils ')).toBe(true)
    expect(matchesQuery(jever, 'friesland')).toBe(true)
    expect(matchesQuery(jever, 'jever weizen')).toBe(false)
    expect(matchesQuery(jever, '')).toBe(true)
  })
})

describe('filterLibrary', () => {
  const ratings: Ratings = {
    jever: { rating: 'LIKE', at: 1 },
    clausthaler: { rating: 'DISLIKE', at: 2 },
  }

  it('no filter: every beer, sorted by name', () => {
    const all = filterLibrary(beers, NO_FILTER, {})
    expect(all).toHaveLength(beers.length)
    const names = all.map((b) => b.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'de')))
  })

  it('combines group, alcohol and rating', () => {
    expect(ids(filterLibrary(beers, { ...NO_FILTER, rating: 'LIKE' }, ratings))).toEqual(['jever'])
    expect(ids(filterLibrary(beers, { ...NO_FILTER, group: 'alkoholfrei', rating: 'DISLIKE' }, ratings))).toEqual(['clausthaler'])
    const unrated = filterLibrary(beers, { ...NO_FILTER, group: 'alkoholfrei', rating: 'unrated' }, ratings)
    expect(ids(unrated).sort()).toEqual(['erdinger-af', 'jever-fun'])
    for (const b of filterLibrary(beers, { ...NO_FILTER, abv: 'strong' }, ratings)) expect(b.abv).toBeGreaterThan(5.5)
  })

  it('chip counts follow the other filters', () => {
    const counts = groupCounts(beers, { ...NO_FILTER, rating: 'LIKE' }, ratings)
    expect(counts).toEqual({ hell: 1, dunkel: 0, weizen: 0, hopfen: 0, alkoholfrei: 0 })
    const total = Object.values(groupCounts(beers, NO_FILTER, {})).reduce((a, b) => a + b, 0)
    expect(total).toBe(beers.filter((b) => styleGroup(b)).length)
  })
})

describe('helpers', () => {
  it('alcohol bands', () => {
    expect([abvBand(0.5), abvBand(4.4), abvBand(4.5), abvBand(5.5), abvBand(5.6)]).toEqual(['light', 'light', 'normal', 'normal', 'strong'])
  })

  it('postcodes have 4 or 5 digits', () => {
    expect([isPostcode('74906'), isPostcode(' 8010 '), isPostcode('123'), isPostcode('Jever')]).toEqual([true, true, false, false])
  })
})
