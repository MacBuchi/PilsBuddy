import { cellBounds, cellOf, cellsWithin, RADII } from '../domain/geo'
import type { LatLon, Radius } from '../domain/geo'
import { sanitizeBeerRow, sanitizeBrewery } from '../domain/regionalBeer'
import type { RegionalBeerRow, RegionalBrewery } from '../domain/regionalBeer'
import { SUPABASE_KEY, SUPABASE_URL } from '../sync/config'

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
const VERSION = 1

export const CELL_TTL_MS = 30 * 24 * 3600 * 1000
/** Cells per request: a dense cell has ~50 breweries, so a batch stays far below the API's row cap. */
const BATCH = 6
const MAX_CELLS = 200
const MAX_SNAPS = 300

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
  /** „74906 Bad Rappenau“ */
  label: string
}

/** Centre of a typed DE/AT/CH postcode, or null. Throws if the API is unreachable. */
export async function findPostcode(plz: string, fetchFn: FetchFn = fetch): Promise<Place | null> {
  const code = plz.trim()
  if (!/^[0-9]{4,5}$/.test(code)) return null
  const res = await fetchFn(`${SUPABASE_URL}/rest/v1/places?select=postcode,name,lat,lon&postcode=eq.${code}&order=country.asc,name.asc&limit=1`, {
    headers: { apikey: SUPABASE_KEY },
  })
  if (!res.ok) throw new Error(`places ${res.status}`)
  const [p] = (await res.json()) as { postcode?: unknown; name?: unknown; lat?: unknown; lon?: unknown }[]
  if (!p || typeof p.name !== 'string' || typeof p.lat !== 'number' || typeof p.lon !== 'number') return null
  return { label: `${code} ${p.name.slice(0, 80)}`, lat: p.lat, lon: p.lon }
}

/* ---------- preferences ---------- */

export interface RegionalPrefs {
  radius: Radius
  /** How the user found their spot last time; a position is never stored, a typed postcode is. */
  mode: 'geo' | 'plz' | null
  place: Place | null
}

export function readPrefs(): RegionalPrefs {
  const p = read<Partial<RegionalPrefs>>(PREFS_KEY)
  const place = p?.place
  const okPlace = !!place && typeof place.label === 'string' && typeof place.lat === 'number' && typeof place.lon === 'number'
  return {
    radius: (RADII as readonly number[]).includes(p?.radius as number) ? (p!.radius as Radius) : 25,
    mode: p?.mode === 'geo' || (p?.mode === 'plz' && okPlace) ? p.mode : null,
    place: okPlace ? { label: place.label.slice(0, 90), lat: place.lat, lon: place.lon } : null,
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

/** „Profil zurücksetzen“: postcode, radius, snapshots and cached cells go too. */
export function forgetRegional(): void {
  for (const key of [CELLS_KEY, SNAPS_KEY, PREFS_KEY]) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* nothing stored */
    }
  }
}
