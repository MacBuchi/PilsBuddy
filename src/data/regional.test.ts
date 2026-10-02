import { afterEach, describe, expect, it, vi } from 'vitest'
import { CELL_TTL_MS, CELLS_KEY, fetchCells, findPostcode, forgetRegional, loadRegion, POOL_KEY, readPool, readPrefs, readSnapshots, writePool, writePrefs, writeSnapshot } from './regional'

const MANNHEIM = { lat: 49.49, lon: 8.47 }
const eichbaum = {
  id: 'osm-n1',
  name: 'Privatbrauerei Eichbaum',
  lat: 49.4954,
  lon: 8.4823,
  city: 'Mannheim',
  postcode: '68169',
  country: 'DE',
  website: 'https://eichbaum.de/',
  founded: 1679,
  regional_beers: [{ id: 'r-4000000000001', name: 'Ureich Pils', style: 'Pils', abv: 4.9, pack: null, rank: 0, source: 1, source_ref: '4000000000001' }],
}

function stubStorage() {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => void stored.set(k, v),
    removeItem: (k: string) => void stored.delete(k),
  })
  return stored
}

const api = (rows: unknown[]) => vi.fn(async (_url: string) => new Response(JSON.stringify(rows), { status: 200 }))
const offline = () => vi.fn(async (_url: string) => Promise.reject(new TypeError('offline')))

afterEach(() => vi.unstubAllGlobals())

describe('fetchCells', () => {
  it('asks only for whole cells – the position is not in the request', async () => {
    const f = api([eichbaum])
    const out = await fetchCells(['98:16', '99:16'], f as unknown as typeof fetch)
    const url = decodeURIComponent(f.mock.calls[0][0])
    expect(url).toContain('or=(and(lat.gte.49,lat.lt.49.5,lon.gte.8,lon.lt.8.5),and(lat.gte.49.5,lat.lt.50,lon.gte.8,lon.lt.8.5))')
    expect(url).not.toContain('49.49')
    expect(url).not.toContain('8.47')
    expect(out['98:16']).toHaveLength(1)
    expect(out['99:16']).toEqual([])
  })

  it('splits many cells into several requests', async () => {
    const f = api([])
    await fetchCells(Array.from({ length: 13 }, (_, i) => `98:${i}`), f as unknown as typeof fetch)
    expect(f).toHaveBeenCalledTimes(3)
  })
})

describe('loadRegion', () => {
  it('fetches the cells once and serves them from the cache for 30 days', async () => {
    stubStorage()
    const f = api([eichbaum])
    const first = await loadRegion(MANNHEIM, 10, f as unknown as typeof fetch, 1000)
    expect(first.breweries.map((b) => b.id)).toEqual(['osm-n1'])
    expect(first.offline).toBe(false)
    const calls = f.mock.calls.length
    await loadRegion(MANNHEIM, 10, f as unknown as typeof fetch, 1000 + CELL_TTL_MS - 1)
    expect(f.mock.calls.length).toBe(calls)
    await loadRegion(MANNHEIM, 10, f as unknown as typeof fetch, 1000 + CELL_TTL_MS + 1)
    expect(f.mock.calls.length).toBeGreaterThan(calls)
  })

  it('offline: stale cells are better than none', async () => {
    const stored = stubStorage()
    await loadRegion(MANNHEIM, 10, api([eichbaum]) as unknown as typeof fetch, 0)
    const r = await loadRegion(MANNHEIM, 10, offline() as unknown as typeof fetch, CELL_TTL_MS * 3)
    expect(r).toMatchObject({ offline: true })
    expect(r.breweries).toHaveLength(1)
    expect(stored.get(CELLS_KEY)).toBeTruthy()
  })

  it('offline without cache: nothing, but no crash', async () => {
    stubStorage()
    expect(await loadRegion(MANNHEIM, 25, offline() as unknown as typeof fetch)).toEqual({ breweries: [], offline: true })
  })
})

describe('findPostcode', () => {
  it('sends only the typed postcode and returns its centre', async () => {
    const f = api([{ postcode: '74906', name: 'Bad Rappenau', lat: 49.2386, lon: 9.1016 }])
    expect(await findPostcode(' 74906 ', f as unknown as typeof fetch)).toEqual({ label: '74906 Bad Rappenau', lat: 49.2386, lon: 9.1016 })
    expect(f.mock.calls[0][0]).toContain('postcode=eq.74906')
    expect(await findPostcode('abc', f as unknown as typeof fetch)).toBeNull()
    expect(await findPostcode('99999', api([]) as unknown as typeof fetch)).toBeNull()
  })
})

describe('prefs and snapshots', () => {
  it('prefs fall back to 25 km and never hold a position', () => {
    stubStorage()
    expect(readPrefs()).toEqual({ radius: 25, mode: null, place: null, deck: false })
    writePrefs({ radius: 50, mode: 'geo', place: null, deck: true })
    expect(readPrefs()).toEqual({ radius: 50, mode: 'geo', place: null, deck: true })
    writePrefs({ radius: 7 as 10, mode: 'plz', place: null, deck: 'ja' as unknown as boolean })
    expect(readPrefs()).toEqual({ radius: 25, mode: null, place: null, deck: false })
  })

  it('remembers touched beers with their brewery facts, newest wins', () => {
    stubStorage()
    const row = { id: 'r-4000000000001', name: 'Ureich Pils', style: 'Pils', abv: 4.9, pack: null, rank: 0, source: 1, source_ref: '4000000000001' }
    const brewery = { ...eichbaum, beers: [], country: 'DE' as const }
    writeSnapshot(row, brewery, 1)
    writeSnapshot({ ...row, name: 'Ureich Premium Pils' }, brewery, 2)
    const snaps = readSnapshots()
    expect(snaps).toHaveLength(1)
    expect(snaps[0].row.name).toBe('Ureich Premium Pils')
    expect(snaps[0].brewery).not.toHaveProperty('beers')
  })

  it('keeps the last finder result as pool for the Regional-Modus, nearest first, checked on read', () => {
    const stored = stubStorage()
    const row = (id: string) => ({ id, name: id, style: 'Pils', abv: 4.9, pack: null, rank: 0, source: 1, source_ref: null })
    const brewery = { ...eichbaum, beers: [row('r-x1')], country: 'DE' as const }
    writePool([{ row: row('r-far'), brewery, km: 40.04 }, { row: row('r-near'), brewery, km: 2.26 }])
    const pool = readPool()
    expect(pool.map((p) => [p.row.id, p.km])).toEqual([['r-near', 2.3], ['r-far', 40]])
    expect(pool[0].brewery).not.toHaveProperty('beers')
    stored.set(POOL_KEY, JSON.stringify({ v: 1, data: [{ row: row('kaputt'), brewery, km: 1 }, { row: row('r-ok'), brewery, km: -1 }, { row: row('r-ok2'), brewery, km: 5 }] }))
    expect(readPool().map((p) => p.row.id)).toEqual(['r-ok2'])
  })

  it('„Profil zurücksetzen“ forgets postcode, snapshots and pool', () => {
    const stored = stubStorage()
    writePrefs({ radius: 10, mode: 'plz', place: { label: '74906 Bad Rappenau', lat: 49.2, lon: 9.1 }, deck: true })
    writePool([{ row: { id: 'r-4000000000001', name: 'X', style: null, abv: null, pack: null, rank: 0, source: 1, source_ref: '1' }, brewery: { ...eichbaum, country: 'DE' }, km: 3 }])
    writeSnapshot({ id: 'r-4000000000001', name: 'X', style: null, abv: null, pack: null, rank: 0, source: 1, source_ref: '1' }, { ...eichbaum, beers: [], country: 'DE' })
    forgetRegional()
    expect(stored.size).toBe(0)
  })
})
