import { afterEach, describe, expect, it, vi } from 'vitest'
import { CELL_TTL_MS, CELLS_KEY, fetchBreweryMap, fetchChanges, FRESH_EVERY_MS, FRESH_KEY, fetchRegionalByIds, fetchCells, findPostcode, forgetRegional, loadBrewery, loadBreweryMap, loadRegion, MAP_KEY, POOL_KEY, readPool, readPrefs, readSnapshots, refreshPool, searchNear, searchPattern, searchRegional, writePool, writePrefs, writeSnapshot } from './regional'

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
    // the hourly change check (R12) may ask – but the cells themselves come from the cache
    const cellCalls = () => f.mock.calls.filter((c) => decodeURIComponent(c[0]).includes('or=(and(lat')).length
    const calls = cellCalls()
    await loadRegion(MANNHEIM, 10, f as unknown as typeof fetch, 1000 + CELL_TTL_MS - 1)
    expect(cellCalls()).toBe(calls)
    await loadRegion(MANNHEIM, 10, f as unknown as typeof fetch, 1000 + CELL_TTL_MS + 1)
    expect(cellCalls()).toBeGreaterThan(calls)
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
  const F = (rows: unknown[]) => api(rows) as unknown as typeof fetch
  it('sends only the typed postcode and returns its centre', async () => {
    const f = api([{ country: 'DE', postcode: '74906', name: 'Bad Rappenau', lat: 49.2386, lon: 9.1016 }])
    expect(await findPostcode(' 74906 ', f as unknown as typeof fetch, 'de-DE')).toEqual([{ label: '74906 Bad Rappenau', lat: 49.2386, lon: 9.1016, country: 'DE' }])
    expect(f.mock.calls[0][0]).toContain('postcode=eq.74906')
    expect(await findPostcode('abc', f as unknown as typeof fetch, 'de-DE')).toEqual([])
    expect(await findPostcode('99999', F([]), 'de-DE')).toEqual([])
  })

  it('cuts a Canadian postcode to its FSA before asking', async () => {
    const f = api([{ country: 'CA', postcode: 'J3L', name: 'Chambly', lat: 45.45, lon: -73.29 }])
    expect(await findPostcode('j3l 2c7', f as unknown as typeof fetch, 'fr-CA')).toEqual([{ label: 'J3L Chambly', lat: 45.45, lon: -73.29, country: 'CA' }])
    expect(f.mock.calls[0][0]).toContain('postcode=eq.J3L&')
    expect(f.mock.calls[0][0]).not.toContain('2C7')
  })

  it('offers every country for a shared code, the browser region first', async () => {
    const rows = [
      { country: 'DE', postcode: '10115', name: 'Berlin', lat: 52.53, lon: 13.38 },
      { country: 'US', postcode: '10115', name: 'New York', lat: 40.81, lon: -73.96 },
      { country: 'XX', postcode: '10115', name: 'Nowhere', lat: 0, lon: 0 },
    ]
    expect((await findPostcode('10115', F(rows), 'de-DE')).map((p) => p.label)).toEqual(['10115 Berlin (Deutschland)', '10115 New York (USA)'])
    expect((await findPostcode('10115', F(rows), 'en-US')).map((p) => p.label)).toEqual(['10115 New York (USA)', '10115 Berlin (Deutschland)'])
  })
})

describe('prefs and snapshots', () => {
  it('prefs fall back to 25 km and never hold a position', () => {
    stubStorage()
    expect(readPrefs()).toEqual({ radius: 25, mode: null, place: null, deck: true })
    writePrefs({ radius: 50, mode: 'geo', place: null, deck: true })
    expect(readPrefs()).toEqual({ radius: 50, mode: 'geo', place: null, deck: true })
    writePrefs({ radius: 7 as 10, mode: 'plz', place: null, deck: 'ja' as unknown as boolean })
    expect(readPrefs()).toEqual({ radius: 25, mode: null, place: null, deck: true })
    // the Regional-Modus is on unless switched off; a place keeps a known country only
    writePrefs({ radius: 10, mode: 'plz', place: { label: '74906 Bad Rappenau', lat: 49.2, lon: 9.1, country: 'XX' as 'DE' }, deck: false })
    expect(readPrefs()).toEqual({ radius: 10, mode: 'plz', place: { label: '74906 Bad Rappenau', lat: 49.2, lon: 9.1 }, deck: false })
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

  it('refreshPool loads the surroundings like the finder and keeps them; offline the old pool stays (2026-10-17)', async () => {
    stubStorage()
    const pool = await refreshPool(MANNHEIM, 10, api([eichbaum]) as unknown as typeof fetch)
    expect(pool.map((p) => p.row.id)).toEqual(['r-4000000000001'])
    expect(pool[0].km).toBeLessThan(2)
    expect((await refreshPool({ lat: 52.5, lon: 13.4 }, 10, offline() as unknown as typeof fetch)).map((p) => p.row.id)).toEqual(['r-4000000000001'])
  })

  it('„Profil zurücksetzen“ forgets postcode, snapshots and pool', () => {
    const stored = stubStorage()
    writePrefs({ radius: 10, mode: 'plz', place: { label: '74906 Bad Rappenau', lat: 49.2, lon: 9.1 }, deck: true })
    writePool([{ row: { id: 'r-4000000000001', name: 'X', style: null, abv: null, pack: null, rank: 0, source: 1, source_ref: '1' }, brewery: { ...eichbaum, country: 'DE' }, km: 3 }])
    writeSnapshot({ id: 'r-4000000000001', name: 'X', style: null, abv: null, pack: null, rank: 0, source: 1, source_ref: '1' }, { ...eichbaum, beers: [], country: 'DE' })
    stored.set(MAP_KEY, '{"v":1,"data":{"at":1,"rows":[]}}')
    forgetRegional()
    expect(stored.size).toBe(0)
  })
})

describe('library search (R8)', () => {
  it('only letters, digits and hyphens reach the filter; under 3 characters nothing is sent', () => {
    expect(searchPattern('Ureich Pils')).toBe('*Ureich*Pils*')
    expect(searchPattern('a),or=(id.neq.x')).toBe('*a*or*id*neq*x*')
    expect(searchPattern('Bräu-Stüberl')).toBe('*Bräu-Stüberl*')
    expect(searchPattern(' ab ')).toBeNull()
    expect(searchPattern('*%,.')).toBeNull()
  })

  it('finds beers by name and by brewery/town, each beer once, without any position', async () => {
    const beerHit = { ...eichbaum.regional_beers[0], breweries: { ...eichbaum, regional_beers: undefined } }
    const f = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/regional_beers?') ? [beerHit, { id: 'bad' }] : [eichbaum]), { status: 200 }))
    const found = await searchRegional('ureich', f as unknown as typeof fetch)
    expect(found.map((x) => [x.row.id, x.brewery.name])).toEqual([['r-4000000000001', 'Privatbrauerei Eichbaum']])
    const urls = f.mock.calls.map((c) => decodeURIComponent(c[0]))
    expect(urls[0]).toContain('name=ilike.*ureich*')
    expect(urls[1]).toContain('or=(name.ilike.*ureich*,city.ilike.*ureich*)')
    expect(urls.join()).not.toMatch(/lat\.|lon\./)
    expect(await searchRegional('ur', f as unknown as typeof fetch)).toEqual([])
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('throws when the API is down, so the screen can say so', async () => {
    await expect(searchRegional('ureich', offline() as unknown as typeof fetch)).rejects.toThrow()
  })

  it('postcode search keeps the breweries inside the radius', async () => {
    stubStorage()
    const far = { ...eichbaum, id: 'osm-n2', lat: 49.99, lon: 8.47, regional_beers: [{ ...eichbaum.regional_beers[0], id: 'r-4000000000002' }] }
    const found = await searchNear(MANNHEIM, 10, api([eichbaum, far]) as unknown as typeof fetch)
    expect(found.map((x) => x.row.id)).toEqual(['r-4000000000001'])
  })
})

describe('world map', () => {
  const brewery = (i: number) => ({ id: `osm-n${String(i).padStart(5, '0')}`, name: `Brauerei ${i}`, lat: 49 + i / 1e4, lon: 9, country: 'DE' })
  /** A fake API with `total` breweries that honours limit/offset. */
  const paged = (total: number) =>
    vi.fn(async (url: string) => {
      const q = new URL(url).searchParams
      const offset = Number(q.get('offset'))
      const limit = Number(q.get('limit'))
      const rows = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => brewery(offset + i))
      return new Response(JSON.stringify(rows), { status: 200 })
    })

  it('fetches every brewery page by page – id, name, position, no position of the user', async () => {
    const f = paged(2345)
    const all = await fetchBreweryMap(f as unknown as typeof fetch)
    expect(all).toHaveLength(2345)
    expect(new Set(all.map((b) => b.id)).size).toBe(2345)
    const url = decodeURIComponent(f.mock.calls[0][0])
    expect(url).toContain('select=id,name,lat,lon,country&published=eq.true&order=id.asc&limit=1000&offset=0')
    expect(f).toHaveBeenCalledTimes(4) // one parallel round, the third page is short
  })

  it('stops after the first short page, even on an exact multiple', async () => {
    const f = paged(4000)
    expect(await fetchBreweryMap(f as unknown as typeof fetch)).toHaveLength(4000)
    expect(f).toHaveBeenCalledTimes(8)
  })

  it('drops broken rows', async () => {
    const rows = [brewery(1), { id: 'x', name: 'Nowhere', lat: 123, lon: 0 }, { id: 7, name: 'n', lat: 1, lon: 1 }]
    const f = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('offset=0') ? rows : []), { status: 200 }))
    expect((await fetchBreweryMap(f as unknown as typeof fetch)).map((b) => b.id)).toEqual(['osm-n00001'])
  })

  it('caches the list compactly for 30 days, then fetches again; offline the stale list stays', async () => {
    const stored = stubStorage()
    const f = paged(3)
    const first = await loadBreweryMap(f as unknown as typeof fetch, 1000)
    expect(first).toEqual({ breweries: [brewery(0), brewery(1), brewery(2)], offline: false })
    expect(JSON.parse(stored.get(MAP_KEY)!).data.rows[0]).toEqual(['osm-n00000', 'Brauerei 0', 49, 9, 'DE'])
    const calls = f.mock.calls.length
    expect((await loadBreweryMap(f as unknown as typeof fetch, 1000 + CELL_TTL_MS)).breweries).toHaveLength(3)
    expect(f.mock.calls.length).toBe(calls)
    const late = await loadBreweryMap(offline() as unknown as typeof fetch, 1001 + CELL_TTL_MS)
    expect(late.offline).toBe(true)
    expect(late.breweries).toHaveLength(3)
  })

  it('loads a tapped brewery through its whole grid cell, not by id', async () => {
    stubStorage()
    const f = api([eichbaum])
    const b = await loadBrewery({ id: 'osm-n1', lat: 49.4954, lon: 8.4823 }, f as unknown as typeof fetch, 1000)
    expect(b?.beers.map((r) => r.name)).toEqual(['Ureich Pils'])
    const url = decodeURIComponent(f.mock.calls[0][0])
    expect(url).toContain('and(lat.gte.49,lat.lt.49.5,lon.gte.8,lon.lt.8.5)')
    expect(url).not.toContain('osm-n1')
    // the cell is cached: a second tap needs no request
    await loadBrewery({ id: 'osm-n1', lat: 49.4954, lon: 8.4823 }, f as unknown as typeof fetch, 2000)
    expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('fetchRegionalByIds (R11)', () => {
  const beerRow = (id: string) => ({ ...eichbaum.regional_beers[0], id, breweries: { ...eichbaum, regional_beers: undefined } })

  it('asks only for valid ids, in batches, and keeps only what it asked for', async () => {
    const ids = Array.from({ length: 45 }, (_, i) => `r-40000000001${String(i).padStart(2, '0')}`)
    const f = vi.fn(async (url: string) => {
      const asked = decodeURIComponent(url).match(/id=in\.\(([^)]*)\)/)![1].split(',')
      return new Response(JSON.stringify([beerRow(asked[0]), beerRow('r-9999999999999')]), { status: 200 })
    })
    const found = await fetchRegionalByIds([...ids, ids[0], 'pils-1', 'r-;drop'], f as unknown as typeof fetch)
    expect(f).toHaveBeenCalledTimes(2)
    const urls = f.mock.calls.map((c) => decodeURIComponent(c[0]))
    expect(urls[0]).toContain('/rest/v1/regional_beers?')
    expect(urls[0]).toContain('published=eq.true')
    expect(urls.join()).not.toContain('pils-1')
    expect(urls.join()).not.toMatch(/drop|lat\.|lon\./)
    expect(found.map((x) => x.row.id)).toEqual([ids[0], ids[40]])
    expect(found[0].brewery.name).toBe('Privatbrauerei Eichbaum')
  })

  it('throws when the API is down', async () => {
    await expect(fetchRegionalByIds(['r-4000000000001'], offline() as unknown as typeof fetch)).rejects.toThrow()
  })
})

describe('changed cells (R12)', () => {
  const HOUR = FRESH_EVERY_MS
  /** API double: cells answer with `cell`, the change queries with `beerChanges` / `breweryChanges`. */
  function backend(cell: unknown[], beerChanges: unknown[] = [], breweryChanges: unknown[] = []) {
    return vi.fn(async (url: string) => {
      const u = decodeURIComponent(url)
      const rows = u.includes('updated_at=gt.') ? (u.includes('/regional_beers?') ? beerChanges : breweryChanges) : cell
      return new Response(JSON.stringify(rows), { status: 200 })
    })
  }
  const cellCalls = (f: ReturnType<typeof backend>) => f.mock.calls.filter((c) => decodeURIComponent(c[0]).includes('or=(and(lat')).length
  const changeUrls = (f: ReturnType<typeof backend>) => f.mock.calls.map((c) => decodeURIComponent(c[0])).filter((u) => u.includes('updated_at=gt.'))

  it('fetchChanges: only a timestamp goes out, the cells are worked out on the device', async () => {
    const f = backend([], [{ updated_at: '2026-10-13T10:00:00+00:00', breweries: { lat: 49.4954, lon: 8.4823 } }], [{ updated_at: '2026-10-13T11:00:00+00:00', lat: 52.52, lon: 13.4 }])
    const c = await fetchChanges('2026-10-01T00:00:00.000Z', f as unknown as typeof fetch)
    expect([...c.cells].sort()).toEqual(['98:16', '105:26'].sort())
    expect(c).toMatchObject({ all: false, mark: '2026-10-13T11:00:00+00:00' })
    for (const u of changeUrls(f)) {
      expect(u).toContain('updated_at=gt.2026-10-01T00:00:00.000Z')
      expect(u).not.toMatch(/lat\.|lon\.|or=/)
    }
  })

  it('reloads a cached cell once something in it changed – an approved beer shows up', async () => {
    const stored = stubStorage()
    const t0 = 1_000_000
    const before = backend([eichbaum])
    await loadRegion(MANNHEIM, 10, before as unknown as typeof fetch, t0)
    expect(changeUrls(before)).toEqual([]) // just loaded – nothing to check

    const approved = { id: 'r-app12', name: 'Gemeldetes Hell', style: 'Helles', abv: 5, pack: null, rank: 1, source: 5, source_ref: null }
    const after = backend(
      [{ ...eichbaum, regional_beers: [...eichbaum.regional_beers, approved] }],
      [{ updated_at: '2026-10-13T12:00:00+00:00', breweries: { lat: eichbaum.lat, lon: eichbaum.lon } }],
    )
    // within the hour: cache only
    await loadRegion(MANNHEIM, 10, after as unknown as typeof fetch, t0 + HOUR - 1)
    expect(after).not.toHaveBeenCalled()
    // an hour later: the check finds the change, the cell comes again
    const r = await loadRegion(MANNHEIM, 10, after as unknown as typeof fetch, t0 + HOUR + 1)
    expect(r.breweries[0].beers.map((b) => b.id)).toContain('r-app12')
    expect(cellCalls(after)).toBe(1)
    expect(JSON.parse(stored.get(FRESH_KEY)!).data.mark).toBe('2026-10-13T12:00:00+00:00')

    // next look asks from the server mark on; nothing new → no cell request
    const quiet = backend([eichbaum])
    await loadRegion(MANNHEIM, 10, quiet as unknown as typeof fetch, t0 + 3 * HOUR)
    expect(changeUrls(quiet)[0]).toContain('updated_at=gt.2026-10-13T12:00:00+00:00')
    expect(cellCalls(quiet)).toBe(0)
  })

  it('changes elsewhere leave the cache alone; too many changes reload everything', async () => {
    stubStorage()
    await loadRegion(MANNHEIM, 10, backend([eichbaum]) as unknown as typeof fetch, 0)
    const elsewhere = backend([eichbaum], [{ updated_at: '2026-10-13T12:00:00+00:00', breweries: { lat: 52.52, lon: 13.4 } }])
    await loadRegion(MANNHEIM, 10, elsewhere as unknown as typeof fetch, 2 * HOUR)
    expect(cellCalls(elsewhere)).toBe(0)
    const many = Array.from({ length: 500 }, () => ({ updated_at: '2026-10-13T13:00:00+00:00', lat: 52.52, lon: 13.4 }))
    const imported = backend([eichbaum], [], many)
    await loadRegion(MANNHEIM, 10, imported as unknown as typeof fetch, 4 * HOUR)
    expect(cellCalls(imported)).toBeGreaterThan(0)
  })

  it('offline check: the cache answers and the next load asks again', async () => {
    stubStorage()
    await loadRegion(MANNHEIM, 10, backend([eichbaum]) as unknown as typeof fetch, 0)
    const r = await loadRegion(MANNHEIM, 10, offline() as unknown as typeof fetch, 2 * HOUR)
    expect(r).toEqual({ breweries: expect.any(Array), offline: false })
    expect(r.breweries).toHaveLength(1)
    const again = backend([eichbaum])
    await loadRegion(MANNHEIM, 10, again as unknown as typeof fetch, 2 * HOUR + 1)
    expect(changeUrls(again).length).toBeGreaterThan(0)
  })
})
