import { describe, expect, it } from 'vitest'
import { BEERS } from '../data/beers'
import { qualityOf, swipeable } from './quality'
import { sanitizeBeerRow, toRegionalBeer } from './regionalBeer'

const brewery = { id: 'osm-n1', name: 'Löwenbräu', lat: 49.2, lon: 9.1, city: 'Hintertupfing', postcode: '74906', country: 'DE' as const, website: null, founded: null }
const row = { id: 'r-4001', name: 'Löwen Pils', style: 'Pils', abv: 4.9, pack: null, rank: 0, source: 1, source_ref: '4001' }

describe('V1 – beer quality in the app', () => {
  it('curated beers are researched by hand (3)', () => {
    expect(BEERS.every((b) => qualityOf(b) === 3)).toBe(true)
  })

  it('regional rows carry their level; rows from before V1 count as „gefunden“', () => {
    expect(sanitizeBeerRow({ ...row, quality: 2 })?.quality).toBe(2)
    expect(sanitizeBeerRow(row)?.quality).toBe(1)
    expect(sanitizeBeerRow({ ...row, quality: 7 })?.quality).toBe(1)
    expect(sanitizeBeerRow({ ...row, quality: '0' })?.quality).toBe(0)
    expect(qualityOf(toRegionalBeer(row, brewery))).toBe(1)
  })

  it('a regional beer is never „geprüft“ – that takes research by hand', () => {
    expect(qualityOf(toRegionalBeer({ ...row, quality: 3 }, brewery))).toBe(2)
  })

  it('only „fraglich“ stays out of the deck', () => {
    expect(swipeable(toRegionalBeer({ ...row, quality: 0 }, brewery))).toBe(false)
    expect(swipeable(toRegionalBeer({ ...row, quality: 1 }, brewery))).toBe(true)
    expect(swipeable(BEERS[0])).toBe(true)
  })
})
