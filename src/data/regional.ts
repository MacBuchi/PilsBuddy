import { cellBounds, cellOf, cellsWithin, haversineKm, RADII } from '../domain/geo'
import type { LatLon, Radius } from '../domain/geo'
import { orderPlaces, parsePostcode, preferredCountries } from '../domain/postcode'
import { sanitizeBeerRow, sanitizeBrewery } from '../domain/regionalBeer'
import type { Country, RegionalBeerRow, RegionalBrewery } from '../domain/regionalBeer'
import { SUPABASE_KEY, SUPABASE_URL } from '../sync/config'
import { COPY } from './copy'

/**
 * Regional catalogue on the device (Stufe R4). The backend only ever sees whole 0.5° grid cells
 * (or a typed postcode) – never the position. Cells are cached for 30 days, so the finder works
 * offline for places the user looked at before. Plain fetch, anonymous, read-only (like catalog.ts).
 *
 * Regional beers the user touched (opened, put on the list, rated) are kept as snapshots, so they stay
 * known in Detail, Probierliste and DNA after a reload – see `rememberRegional` in beers.ts.
 */

export const CELLS_KEY = 'pilsbuddy.regional.cells'
export const SNAPS_KEY = 'pilsbuddy.regional.beers'
export const PREFS_KEY = 'pilsbuddy.regional.prefs'
export const POOL_KEY = 'pilsbuddy.regional.pool'
export const MAP_KEY = 'pilsbuddy.regional.map'
export const FRESH_KEY = 'pilsbuddy.regional.fresh'
const VERSION = 1

export const CELL_TTL_MS = 30 * 24 * 3600 * 1000
/** R12: how often cached cells ask whether something in them changed (an approved report, an import). */
export const FRESH_EVERY_MS = 3600 * 1000
const CHANGES_LIMIT = 500
/** Cells per request: a dense cell has ~50 breweries, so a batch stays far below the API's row cap. */
const BATCH = 6
const MAX_CELLS = 200
const MAX_SNAPS = 300
/** Regional-first deck (2026-10-17): enough nearby beers for many sessions of swiping. */
const MAX_POOL = 200

type FetchFn = typeof fetch

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as { v?: unknown; data?: T }) : null
    return parsed?.v === VERSION && parsed.data && typeof parsed.data === 'object' ? parsed.data : null
  } catch {
    return null
  }
}

function write(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ v: VERSION, data }))
  } catch {
    /* quota / private mode – works for this session from memory */
  }
}

/* ---------- grid cells ---------- */

interface CellEntry {
  at: number
  rows: unknown[]
}

// beer rows as `*`: a column added later (V1 `quality`) arrives once its migration is live and is simply missing before –
// sanitizeBeerRow fills the default, so the app never asks for a column the database does not have yet
const SELECT = 'id,name,lat,lon,city,postcode,country,website,founded,regional_beers(*)'

const cellFilter = (key: string) => {
  const b = cellBounds(key)
  return `and(lat.gte.${b.latMin},lat.lt.${b.latMax},lon.gte.${b.lonMin},lon.lt.${b.lonMax})`
}

/** Breweries (with their main beers) of the given cells, straight from the API, grouped by cell. */
export async function fetchCells(keys: readonly string[], fetchFn: FetchFn = fetch): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = Object.fromEntries(keys.map((k) => [k, []]))
  const batches: string[][] = []
  for (let i = 0; i < keys.length; i += BATCH) batches.push(keys.slice(i, i + BATCH))
  await Promise.all(
    batches.map(async (batch) => {
      const q = `select=${SELECT}&published=eq.true&or=(${batch.map(cellFilter).join(',')})&order=id.asc&limit=1000`
      const res = await fetchFn(`${SUPABASE_URL}/rest/v1/breweries?${q}`, { headers: { apikey: SUPABASE_KEY } })
      if (!res.ok) throw new Error(`breweries ${res.status}`)
      const rows = (await res.json()) as unknown
      if (!Array.isArray(rows)) throw new Error('breweries: no list')
      for (const row of rows) {
        const b = sanitizeBrewery(row)
        const k = b && cellOf(b)
        if (k && k in out) out[k].push(row)
      }
    }),
  )
  return out
}

export interface RegionLoad {
  breweries: RegionalBrewery[]
  /** The network failed; what is shown comes from the cache (maybe nothing). */
  offline: boolean
}

/**
 * The breweries of the given cells: fresh cache first, the rest from the API. If the API is unreachable,
 * stale cells are better than none.
 */
async function loadCells(keys: readonly string[], fetchFn: FetchFn, now: number): Promise<RegionLoad> {
  const cache = read<Record<string, CellEntry>>(CELLS_KEY) ?? {}
  const missing = keys.filter((k) => !cache[k] || now - cache[k].at > CELL_TTL_MS)
  // R12: cached cells with a change since the last look are loaded again – an approved beer shows up right away
  const freshness = read<Freshness>(FRESH_KEY)
  const known = typeof freshness?.mark === 'string' && !Number.isNaN(Date.parse(freshness.mark)) ? freshness.mark : null
  const cached = keys.filter((k) => !missing.includes(k))
  // cells fetched now are current – with nothing else cached, this load counts as a look
  let marked: Freshness | null = cached.length ? null : { checked: now, mark: known }
  if (cached.length && (!freshness || !(now - freshness.checked < FRESH_EVERY_MS))) {
    try {
      // no mark yet: a day before the oldest cached cell (device clock) – a cell may load twice, none is missed
      const since = known ?? new Date(Math.min(...cached.map((k) => cache[k].at)) - 24 * 3600 * 1000).toISOString()
      const changes = await fetchChanges(since, fetchFn)
      for (const k of cached) if (changes.all || changes.cells.has(k)) missing.push(k)
      marked = { checked: now, mark: changes.mark ?? known }
    } catch {
      /* offline – the cache answers, the next load asks again */
    }
  }
  let offline = false
  if (!missing.length && marked) write(FRESH_KEY, marked)
  if (missing.length) {
    try {
      const fresh = await fetchCells(missing, fetchFn)
      if (marked) write(FRESH_KEY, marked)
      for (const k of missing) cache[k] = { at: now, rows: fresh[k] }
      // keep the cache small: drop expired cells, then the oldest
      const kept = Object.entries(cache)
        .filter(([, e]) => now - e.at <= CELL_TTL_MS)
        .sort((a, b) => b[1].at - a[1].at)
        .slice(0, MAX_CELLS)
      write(CELLS_KEY, Object.fromEntries(kept))
    } catch {
      offline = true
    }
  }
  const breweries = keys.flatMap((k) => (cache[k]?.rows ?? []).map(sanitizeBrewery).filter((b): b is RegionalBrewery => !!b))
  return { breweries, offline }
}

interface Freshness {
  /** Device time of the last look. */
  checked: number
  /** Newest `updated_at` seen – server time, so a wrong device clock misses nothing. */
  mark: string | null
}

export interface Changes {
  cells: Set<string>
  /** Too many changes to list (a catalogue import) – every cached cell is stale. */
  all: boolean
  mark: string | null
}

/**
 * Grid cells with breweries or beers changed after `since` (R12). Only that timestamp goes to the API –
 * no cell, no position; the cells are worked out on the device.
 */
export async function fetchChanges(since: string, fetchFn: FetchFn = fetch): Promise<Changes> {
  const t = encodeURIComponent(since)
  const headers = { apikey: SUPABASE_KEY }
  const tail = `updated_at=gt.${t}&order=updated_at.desc&limit=${CHANGES_LIMIT}`
  const [beers, breweries] = await Promise.all([
    fetchFn(`${SUPABASE_URL}/rest/v1/regional_beers?select=updated_at,breweries!inner(lat,lon)&${tail}`, { headers }),
    fetchFn(`${SUPABASE_URL}/rest/v1/breweries?select=updated_at,lat,lon&${tail}`, { headers }),
  ])
  if (!beers.ok || !breweries.ok) throw new Error(`changes ${beers.status}/${breweries.status}`)
  const beerRows = (await beers.json()) as unknown
  const breweryRows = (await breweries.json()) as unknown
  if (!Array.isArray(beerRows) || !Array.isArray(breweryRows)) throw new Error('changes: no list')
  const cells = new Set<string>()
  let mark: string | null = null
  const points = [
    ...(beerRows as { updated_at?: unknown; breweries?: { lat?: unknown; lon?: unknown } }[]).map((r) => ({ at: r?.updated_at, ...r?.breweries })),
    ...(breweryRows as { updated_at?: unknown; lat?: unknown; lon?: unknown }[]).map((r) => ({ at: r?.updated_at, lat: r?.lat, lon: r?.lon })),
  ]
  for (const p of points) {
    if (typeof p.at !== 'string' || Number.isNaN(Date.parse(p.at))) continue
    if (!mark || Date.parse(p.at) > Date.parse(mark)) mark = p.at
    if (typeof p.lat === 'number' && typeof p.lon === 'number') cells.add(cellOf({ lat: p.lat, lon: p.lon }))
  }
  return { cells, all: beerRows.length >= CHANGES_LIMIT || breweryRows.length >= CHANGES_LIMIT, mark }
}

/** All breweries in the cells around `origin`. */
export function loadRegion(origin: LatLon, radius: number, fetchFn: FetchFn = fetch, now = Date.now()): Promise<RegionLoad> {
  return loadCells(cellsWithin(origin, radius), fetchFn, now)
}

/**
 * One brewery with its beers, for the map's sheet. Asks for the whole grid cell it lies in (like the finder),
 * not for the brewery – and caches the cell. Null if it is not there (or offline without cache).
 */
export async function loadBrewery(p: Pick<MapBrewery, 'id' | 'lat' | 'lon'>, fetchFn: FetchFn = fetch, now = Date.now()): Promise<RegionalBrewery | null> {
  const { breweries } = await loadCells([cellOf(p)], fetchFn, now)
  return breweries.find((b) => b.id === p.id) ?? null
}

/* ---------- all breweries for the world map ---------- */

export interface MapBrewery extends LatLon {
  id: string
  name: string
  /** Where the map starts without a position: the browser's country. */
  country: Country | null
}

export interface MapLoad {
  breweries: MapBrewery[]
  /** The network failed; what is shown comes from the cache (maybe nothing). */
  offline: boolean
}

const MAP_COLS = 'id,name,lat,lon,country'
/** The API's row cap per request. */
const MAP_PAGE = 1000
const MAP_PARALLEL = 4
/** A guard against a runaway loop, far above the catalogue (≈ 14 000 in 2026-10). */
const MAP_MAX = 60000

function mapRow(r: unknown): MapBrewery | null {
  const o = r as { id?: unknown; name?: unknown; lat?: unknown; lon?: unknown; country?: unknown }
  if (typeof o?.id !== 'string' || !o.id || o.id.length > 80 || typeof o.name !== 'string') return null
  if (typeof o.lat !== 'number' || typeof o.lon !== 'number' || Math.abs(o.lat) > 90 || Math.abs(o.lon) > 180) return null
  const country = typeof o.country === 'string' && Object.hasOwn(COPY.countries, o.country) ? (o.country as Country) : null
  return { id: o.id, name: o.name.slice(0, 80), lat: o.lat, lon: o.lon, country }
}

/** Every published brewery (id, name, position) – page by page, a few pages at a time. No position is sent. */
export async function fetchBreweryMap(fetchFn: FetchFn = fetch): Promise<MapBrewery[]> {
  const out: MapBrewery[] = []
  for (let offset = 0; offset < MAP_MAX; offset += MAP_PAGE * MAP_PARALLEL) {
    const pages = await Promise.all(
      Array.from({ length: MAP_PARALLEL }, async (_, i) => {
        const q = `select=${MAP_COLS}&published=eq.true&order=id.asc&limit=${MAP_PAGE}&offset=${offset + i * MAP_PAGE}`
        const res = await fetchFn(`${SUPABASE_URL}/rest/v1/breweries?${q}`, { headers: { apikey: SUPABASE_KEY } })
        if (!res.ok) throw new Error(`breweries ${res.status}`)
        const rows = (await res.json()) as unknown
        if (!Array.isArray(rows)) throw new Error('breweries: no list')
        return rows
      }),
    )
    for (const rows of pages) for (const r of rows) {
      const b = mapRow(r)
      if (b) out.push(b)
    }
    if (pages.some((rows) => rows.length < MAP_PAGE)) break
  }
  return out
}

/**
 * The world map's breweries: cached on the device for 30 days (compact rows), then fetched again. If the API
 * is unreachable, a stale list is better than none.
 */
export function loadBreweryMap(fetchFn: FetchFn = fetch, now = Date.now()): Promise<MapLoad> {
  // one download at a time – reopening the map while it loads joins the running one
  mapLoading ??= loadMap(fetchFn, now).finally(() => {
    mapLoading = null
  })
  return mapLoading
}

let mapLoading: Promise<MapLoad> | null = null

async function loadMap(fetchFn: FetchFn, now: number): Promise<MapLoad> {
  const cached = read<{ at?: unknown; rows?: unknown }>(MAP_KEY)
  const rows = Array.isArray(cached?.rows) ? (cached.rows as unknown[]) : []
  const fromCache = () =>
    rows.flatMap((r) => {
      const b = Array.isArray(r) ? mapRow({ id: r[0], name: r[1], lat: r[2], lon: r[3], country: r[4] }) : null
      return b ? [b] : []
    })
  if (typeof cached?.at === 'number' && now - cached.at <= CELL_TTL_MS && rows.length) return { breweries: fromCache(), offline: false }
  try {
    const breweries = await fetchBreweryMap(fetchFn)
    write(MAP_KEY, { at: now, rows: breweries.map((b) => [b.id, b.name, Math.round(b.lat * 1e5) / 1e5, Math.round(b.lon * 1e5) / 1e5, b.country]) })
    return { breweries, offline: false }
  } catch {
    return { breweries: fromCache(), offline: true }
  }
}

/* ---------- postcode ---------- */

export interface Place extends LatLon {
  /** „74906 Bad Rappenau“ – with the country when the code exists in more than one */
  label: string
  /** The postcode's country – the swipe deck's home region (missing on places saved before 2026-10-17). */
  country?: Country
}

/**
 * Places for a typed postcode, one per country, the browser's region first (10115 is Berlin and Schenectady).
 * Only the coarse code leaves the device: a full Canadian postcode is cut to its FSA first. Empty if unknown,
 * throws if the API is unreachable.
 */
export async function findPostcode(plz: string, fetchFn: FetchFn = fetch, locale = navigator.language): Promise<Place[]> {
  const code = parsePostcode(plz)
  if (!code) return []
  const res = await fetchFn(
    `${SUPABASE_URL}/rest/v1/places?select=country,postcode,name,lat,lon&postcode=eq.${code}&order=country.asc,name.asc&limit=20`,
    { headers: { apikey: SUPABASE_KEY } },
  )
  if (!res.ok) throw new Error(`places ${res.status}`)
  const rows = (await res.json()) as { country?: unknown; name?: unknown; lat?: unknown; lon?: unknown }[]
  const ok = rows.flatMap((p) =>
    typeof p.name === 'string' && typeof p.lat === 'number' && typeof p.lon === 'number' && Object.hasOwn(COPY.countries, p.country as string)
      ? [{ country: p.country as Country, name: p.name.slice(0, 80), lat: p.lat, lon: p.lon }]
      : [],
  )
  const places = orderPlaces(ok, preferredCountries(locale))
  return places.map((p) => ({
    label: places.length > 1 ? `${code} ${p.name} (${COPY.countries[p.country]})` : `${code} ${p.name}`,
    lat: p.lat,
    lon: p.lon,
    country: p.country,
  }))
}

/* ---------- preferences ---------- */

export interface RegionalPrefs {
  radius: Radius
  /** How the user found their spot last time; a position is never stored, a typed postcode is. */
  mode: 'geo' | 'plz' | null
  place: Place | null
  /** R5 Regional-Modus: beers around the user join the swipe deck – on unless switched off (2026-10-17). */
  deck: boolean
}

export function readPrefs(): RegionalPrefs {
  const p = read<Partial<RegionalPrefs>>(PREFS_KEY)
  const place = p?.place
  const okPlace = !!place && typeof place.label === 'string' && typeof place.lat === 'number' && typeof place.lon === 'number'
  return {
    radius: (RADII as readonly number[]).includes(p?.radius as number) ? (p!.radius as Radius) : 25,
    mode: p?.mode === 'geo' || (p?.mode === 'plz' && okPlace) ? p.mode : null,
    place: okPlace
      ? { label: place.label.slice(0, 90), lat: place.lat, lon: place.lon, ...(Object.hasOwn(COPY.countries, place.country ?? '') ? { country: place.country } : {}) }
      : null,
    deck: p?.deck !== false,
  }
}

export const writePrefs = (p: RegionalPrefs) => write(PREFS_KEY, p)

/* ---------- snapshots of touched regional beers ---------- */

export interface Snapshot {
  at: number
  row: RegionalBeerRow
  brewery: Omit<RegionalBrewery, 'beers'>
}

export function readSnapshots(): Snapshot[] {
  const raw = read<Record<string, { at?: unknown; row?: unknown; brewery?: unknown }>>(SNAPS_KEY) ?? {}
  const out: Snapshot[] = []
  for (const s of Object.values(raw)) {
    const row = sanitizeBeerRow(s.row)
    const brewery = sanitizeBrewery(s.brewery)
    if (row && brewery) out.push({ at: typeof s.at === 'number' ? s.at : 0, row, brewery: withoutBeers(brewery) })
  }
  return out
}

function withoutBeers(b: RegionalBrewery | Omit<RegionalBrewery, 'beers'>): Omit<RegionalBrewery, 'beers'> {
  return { id: b.id, name: b.name, lat: b.lat, lon: b.lon, city: b.city, postcode: b.postcode, country: b.country, website: b.website, founded: b.founded }
}

export function writeSnapshot(row: RegionalBeerRow, brewery: RegionalBrewery | Omit<RegionalBrewery, 'beers'>, at = Date.now()): void {
  const all = Object.fromEntries(readSnapshots().map((s) => [s.row.id, s]))
  all[row.id] = { at, row, brewery: withoutBeers(brewery) }
  const kept = Object.values(all)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_SNAPS)
  write(SNAPS_KEY, Object.fromEntries(kept.map((s) => [s.row.id, s])))
}

/* ---------- pool for the Regional-Modus (R5) ---------- */

export interface PoolItem {
  row: RegionalBeerRow
  brewery: Omit<RegionalBrewery, 'beers'>
  km: number
}

/**
 * The beers of the last finder result (nearest first), kept on the device for the swipe deck. Like the
 * cached cells it says which breweries are around the user – it never leaves the device.
 */
export function writePool(items: readonly PoolItem[]): void {
  const kept = [...items].sort((a, b) => a.km - b.km || a.row.id.localeCompare(b.row.id)).slice(0, MAX_POOL)
  write(POOL_KEY, kept.map((i) => ({ row: i.row, brewery: withoutBeers(i.brewery), km: Math.round(i.km * 10) / 10 })))
}

export function readPool(): PoolItem[] {
  const raw = read<unknown[]>(POOL_KEY)
  if (!Array.isArray(raw)) return []
  const out: PoolItem[] = []
  for (const i of raw.slice(0, MAX_POOL) as { row?: unknown; brewery?: unknown; km?: unknown }[]) {
    const row = sanitizeBeerRow(i?.row)
    const brewery = sanitizeBrewery(i?.brewery)
    if (row && brewery && typeof i.km === 'number' && Number.isFinite(i.km) && i.km >= 0 && i.km <= 500) out.push({ row, brewery: withoutBeers(brewery), km: i.km })
  }
  return out
}

/** The beers of the breweries within `radius` km of `origin`, as pool items (nearest first once written). */
export function poolItems(breweries: readonly RegionalBrewery[], origin: LatLon, radius: number): PoolItem[] {
  return breweries.flatMap((b) => {
    const km = haversineKm(origin, b)
    return km <= radius ? b.beers.map((row) => ({ row, brewery: withoutBeers(b), km })) : []
  })
}

/**
 * Regional-first deck: load the surroundings like the finder does (same coarse cells, cached) and keep them as the
 * pool. Offline with nothing cached, the old pool stays.
 */
export async function refreshPool(origin: LatLon, radius: Radius, fetchFn: FetchFn = fetch): Promise<PoolItem[]> {
  const { breweries, offline } = await loadRegion(origin, radius, fetchFn)
  if (offline && !breweries.length) return readPool()
  writePool(poolItems(breweries, origin, radius))
  return readPool()
}

/** „Profil zurücksetzen“: postcode, radius, snapshots, pool, cached cells and the map list go too. */
export function forgetRegional(): void {
  for (const key of [CELLS_KEY, SNAPS_KEY, PREFS_KEY, POOL_KEY, MAP_KEY, FRESH_KEY]) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* nothing stored */
    }
  }
}

/* ---------- search by name (R8 Bierbibliothek) ---------- */

const BEER_COLS = '*'
const BREWERY_COLS = 'id,name,lat,lon,city,postcode,country,website,founded'

/**
 * The typed words as an `ilike` pattern: letters, digits and hyphens only (PostgREST's filter syntax
 * stays out of reach), the words joined by `*`. Null for less than 3 characters.
 */
export function searchPattern(q: string): string | null {
  const words = q
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}-]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const joined = words.join('*')
  return joined.replace(/\*/g, '').length >= 3 ? `*${joined.slice(0, 60)}*` : null
}

export interface RegionalFound {
  row: RegionalBeerRow
  brewery: Omit<RegionalBrewery, 'beers'>
}

/**
 * Regional beers whose name, brewery or brewery town matches the text – without any position: only the
 * typed text goes to the API. Throws if the API is unreachable.
 */
export async function searchRegional(q: string, fetchFn: FetchFn = fetch): Promise<RegionalFound[]> {
  const p = searchPattern(q)
  if (!p) return []
  const like = encodeURIComponent(p)
  const headers = { apikey: SUPABASE_KEY }
  const [byBeer, byBrewery] = await Promise.all([
    fetchFn(`${SUPABASE_URL}/rest/v1/regional_beers?select=${BEER_COLS},breweries!inner(${BREWERY_COLS})&published=eq.true&name=ilike.${like}&order=name.asc&limit=40`, { headers }),
    fetchFn(`${SUPABASE_URL}/rest/v1/breweries?select=${SELECT}&published=eq.true&or=(name.ilike.${like},city.ilike.${like})&order=name.asc&limit=20`, { headers }),
  ])
  if (!byBeer.ok || !byBrewery.ok) throw new Error(`search ${byBeer.status}/${byBrewery.status}`)
  const beerRows = (await byBeer.json()) as unknown
  const breweryRows = (await byBrewery.json()) as unknown
  if (!Array.isArray(beerRows) || !Array.isArray(breweryRows)) throw new Error('search: no list')
  const out = new Map<string, RegionalFound>()
  for (const r of beerRows as { breweries?: unknown }[]) {
    const row = sanitizeBeerRow(r)
    const brewery = sanitizeBrewery(r?.breweries)
    if (row && brewery) out.set(row.id, { row, brewery: withoutBeers(brewery) })
  }
  for (const b of breweryRows.map(sanitizeBrewery)) {
    if (b) for (const row of b.beers) if (!out.has(row.id)) out.set(row.id, { row, brewery: withoutBeers(b) })
  }
  return [...out.values()]
}

/** How many ids one request asks for – keeps the URL short. */
const ID_BATCH = 40

/**
 * Regional beers by id (R11): ratings that came from another device (sync, import) name beers this device
 * has no snapshot of. Only the beer ids go to the API – no rating, no position. Unpublished beers stay
 * unknown. Throws if the API is unreachable.
 */
export async function fetchRegionalByIds(ids: readonly string[], fetchFn: FetchFn = fetch): Promise<RegionalFound[]> {
  const valid = [...new Set(ids)].filter((id) => /^r-[a-z0-9]{2,40}$/.test(id))
  const batches: string[][] = []
  for (let i = 0; i < valid.length; i += ID_BATCH) batches.push(valid.slice(i, i + ID_BATCH))
  const found = await Promise.all(
    batches.map(async (batch) => {
      const q = `select=${BEER_COLS},breweries!inner(${BREWERY_COLS})&published=eq.true&id=in.(${batch.join(',')})&limit=${ID_BATCH}`
      const res = await fetchFn(`${SUPABASE_URL}/rest/v1/regional_beers?${q}`, { headers: { apikey: SUPABASE_KEY } })
      if (!res.ok) throw new Error(`regional_beers ${res.status}`)
      const rows = (await res.json()) as unknown
      if (!Array.isArray(rows)) throw new Error('regional_beers: no list')
      return (rows as { breweries?: unknown }[]).flatMap((r) => {
        const row = sanitizeBeerRow(r)
        const brewery = sanitizeBrewery(r?.breweries)
        return row && brewery && batch.includes(row.id) ? [{ row, brewery: withoutBeers(brewery) }] : []
      })
    }),
  )
  return found.flat()
}

/** Regional beers of the breweries within `radius` km of a typed postcode (the library's PLZ search). */
export async function searchNear(place: LatLon, radius: number, fetchFn: FetchFn = fetch): Promise<RegionalFound[]> {
  const { breweries } = await loadRegion(place, radius, fetchFn)
  return breweries.filter((b) => haversineKm(place, b) <= radius).flatMap((b) => b.beers.map((row) => ({ row, brewery: withoutBeers(b) })))
}
