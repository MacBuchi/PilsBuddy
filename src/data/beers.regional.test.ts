import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeTasteVector } from '../domain/dna'
import { tasteFromStyle } from '../domain/styleProfile'
import { BEER_BY_ID, DECK_ORDER, missingRegional, rememberRegional, restoreRegional } from './beers'
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

describe('restoreRegional (R11)', () => {
  const other = { ...row, id: 'r-4000000000099', name: 'Ureich Export', style: 'Export', abv: 5.4 }
  const api = (rows: unknown[]) => vi.fn(async (_url: string) => new Response(JSON.stringify(rows), { status: 200 }))

  it('loads regional beers rated on another device by id and keeps their snapshots', async () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => void stored.set(k, v) })
    const ids = [other.id, 'r-4000000000777', 'pils-1']
    expect(missingRegional(ids)).toEqual([other.id, 'r-4000000000777'])
    const f = api([{ ...other, breweries: brewery }])
    expect(await restoreRegional(ids, f as unknown as typeof fetch)).toBe(1)
    const url = decodeURIComponent(f.mock.calls[0][0])
    expect(url).toContain(`id=in.(${other.id},r-4000000000777)`)
    expect(BEER_BY_ID[other.id].name).toBe('Ureich Export')
    expect(readSnapshots().map((s) => s.row.id)).toContain(other.id)
    // known now – nothing to ask for that one again
    expect(missingRegional(ids)).toEqual(['r-4000000000777'])
  })

  it('asks nothing when nothing is missing, throws when offline', async () => {
    const f = api([])
    expect(await restoreRegional(['pils-1'], f as unknown as typeof fetch)).toBe(0)
    expect(f).not.toHaveBeenCalled()
    const down = vi.fn(async () => Promise.reject(new TypeError('offline')))
    await expect(restoreRegional(['r-4000000000555'], down as unknown as typeof fetch)).rejects.toThrow()
  })
})
