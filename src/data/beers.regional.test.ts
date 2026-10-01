import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeTasteVector } from '../domain/dna'
import { tasteFromStyle } from '../domain/styleProfile'
import { BEER_BY_ID, DECK_ORDER, rememberRegional } from './beers'
import { readSnapshots } from './regional'

const row = { id: 'r-4000000000001', name: 'Ureich Pils', style: 'Pils', abv: 4.9, pack: null, rank: 0, source: 1, source_ref: '4000000000001' }
const brewery = { id: 'osm-n1', name: 'Privatbrauerei Eichbaum', lat: 49.4954, lon: 8.4823, city: 'Mannheim', postcode: null, country: 'DE' as const, website: null, founded: 1679 }

afterEach(() => vi.unstubAllGlobals())

describe('rememberRegional', () => {
  it('makes a touched regional beer known – with its style estimate – and keeps a snapshot', () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => void stored.set(k, v) })
    expect(BEER_BY_ID[row.id]).toBeUndefined()
    const beer = rememberRegional(row, brewery)
    expect(BEER_BY_ID[row.id]).toBe(beer)
    expect(beer.taste).toEqual(tasteFromStyle('Pils', 4.9))
    expect(readSnapshots().map((s) => s.row.id)).toEqual([row.id])
    // never joins the curated deck, but counts like any rated beer
    expect(DECK_ORDER).not.toContain(row.id)
    expect(computeTasteVector({ [row.id]: { rating: 'LIKE', at: 1 } })).not.toEqual(computeTasteVector({}))
  })
})
