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
const VERSION = 1

export const CELL_TTL_MS = 30 * 24 * 3600 * 1000
/** Cells per request: a dense cell has ~50 breweries, so a batch stays far below the API's row cap. */
const BATCH = 6
const MAX_CELLS = 200
const MAX_SNAPS = 300
const MAX_POOL = 60

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

const SELECT = 'id,name,lat,lon,city,postcode,country,website,founded,regional_beers(id,name,style,abv,pack,rank,source,source_ref)'

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
 * All breweries in the cells around `origin`: fresh cache first, the rest from the API. If the API
 * is unreachable, stale cells are better than none.
 */
export async function loadRegion(origin: LatLon, radius: number, fetchFn: FetchFn = fetch, now = Date.now()): Promise<RegionLoad> {
  const keys = cellsWithin(origin, radius)
  const cache = read<Record<string, CellEntry>>(CELLS_KEY) ?? {}
  const missing = keys.filter((k) => !cache[k] || now - cache[k].at > CELL_TTL_MS)
  let offline = false
  if (missing.length) {
    try {
      const fresh = await fetchCells(missing, fetchFn)
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

/* ---------- postcode ---------- */

export interface Place extends LatLon {
  /** „74906 Bad Rappenau“ – with the country when the code exists in more than one */
  label: string
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
  }))
}

/* ---------- preferences ---------- */

export interface RegionalPrefs {
  radius: Radius
  /** How the user found their spot last time; a position is never stored, a typed postcode is. */
  mode: 'geo' | 'plz' | null
  place: Place | null
  /** R5 Regional-Modus: beers of the last finder result join the swipe deck. */
  deck: boolean
}

export function readPrefs(): RegionalPrefs {
  const p = read<Partial<RegionalPrefs>>(PREFS_KEY)
  const place = p?.place
  const okPlace = !!place && typeof place.label === 'string' && typeof place.lat === 'number' && typeof place.lon === 'number'
  return {
    radius: (RADII as readonly number[]).includes(p?.radius as number) ? (p!.radius as Radius) : 25,
    mode: p?.mode === 'geo' || (p?.mode === 'plz' && okPlace) ? p.mode : null,
    place: okPlace ? { label: place.label.slice(0, 90), lat: place.lat, lon: place.lon } : null,
    deck: p?.deck === true,
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

/** „Profil zurücksetzen“: postcode, radius, snapshots, pool and cached cells go too. */
export function forgetRegional(): void {
  for (const key of [CELLS_KEY, SNAPS_KEY, PREFS_KEY, POOL_KEY]) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* nothing stored */
    }
  }
}

/* ---------- search by name (R8 Bierbibliothek) ---------- */

const BEER_COLS = 'id,name,style,abv,pack,rank,source,source_ref'
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

/** Regional beers of the breweries within `radius` km of a typed postcode (the library's PLZ search). */
export async function searchNear(place: LatLon, radius: number, fetchFn: FetchFn = fetch): Promise<RegionalFound[]> {
  const { breweries } = await loadRegion(place, radius, fetchFn)
  return breweries.filter((b) => haversineKm(place, b) <= radius).flatMap((b) => b.beers.map((row) => ({ row, brewery: withoutBeers(b) })))
}
