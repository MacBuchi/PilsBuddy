import { sanitizeDesign } from '../domain/bottles/sanitize'
import type { Beer, TasteVector } from '../domain/types'
import { SUPABASE_KEY, SUPABASE_URL } from '../sync/config'

/**
 * Beer catalogue from the database (Stufe B3). The bundled beers.json is the base; rows in the
 * `beers` table add new beers or replace a bundled one by id. The app never waits for the
 * network: it starts with the last fetched rows (localStorage) and refreshes them in the
 * background – new beers show up on the next start. Offline or broken rows → the JSON as is.
 */

export const CATALOG_KEY = 'pilsbuddy.catalog'
const CATALOG_VERSION = 1

/** A row as PostgREST returns it. */
export interface CatalogRow {
  id: string
  data: unknown
  sort: number
}

const AXES: (keyof TasteVector)[] = ['bitterness', 'hopIntensity', 'maltiness', 'sweetness', 'dryness', 'body', 'drinkability', 'character']
const str = (v: unknown, max = 400): v is string => typeof v === 'string' && v.length > 0 && v.length <= max

/** The row as a Beer, or null if anything the app relies on is missing or off. */
export function toBeer(row: CatalogRow): Beer | null {
  const d = row.data as Record<string, unknown> | null
  if (!d || typeof d !== 'object' || !/^[a-z0-9-]{1,64}$/.test(row.id)) return null
  const taste = d.taste as Record<string, unknown> | undefined
  if (!taste || !AXES.every((a) => typeof taste[a] === 'number' && taste[a] >= 0 && taste[a] <= 100)) return null
  if (!['name', 'fullName', 'brewery', 'country', 'region', 'style', 'description', 'humorousBio'].every((k) => str(d[k]))) return null
  if (typeof d.abv !== 'number' || d.abv < 0 || d.abv > 20) return null
  if (typeof d.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(d.color)) return null
  const tags = Array.isArray(d.tags) ? d.tags.filter((t): t is string => str(t, 40)).slice(0, 6) : []
  // only our own bottle photos – nothing that loads from elsewhere (a missing file falls back to the generated bottle)
  const image = typeof d.image === 'string' && /^\/bottles\/[a-z0-9-]+\.(svg|png|webp)$/.test(d.image) ? d.image : undefined
  const bottle = sanitizeDesign(d.bottle)
  return {
    id: row.id,
    name: d.name as string,
    fullName: d.fullName as string,
    brewery: d.brewery as string,
    country: d.country as string,
    region: d.region as string,
    abv: d.abv,
    style: d.style as string,
    taste: Object.fromEntries(AXES.map((a) => [a, taste[a]])) as unknown as TasteVector,
    description: d.description as string,
    humorousBio: d.humorousBio as string,
    ...(str(d.disLikeQuip) ? { disLikeQuip: d.disLikeQuip } : {}),
    tags,
    color: d.color,
    ...(image ? { image } : {}),
    ...(bottle ? { bottle } : {}),
    ...(d.reference === true ? { reference: true } : {}),
  }
}

/** Bundled beers with DB rows applied: same id → replaced in place, new ids → appended by `sort`. */
export function mergeCatalog(bundled: readonly Beer[], rows: readonly CatalogRow[]): Beer[] {
  const fromDb = new Map<string, Beer>()
  for (const row of [...rows].sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))) {
    const beer = toBeer(row)
    if (beer) fromDb.set(beer.id, beer)
  }
  const known = new Set(bundled.map((b) => b.id))
  // a DB row without its own bottle design keeps the hand-tuned one of the bundled beer
  const replace = (b: Beer) => {
    const db = fromDb.get(b.id)
    return !db ? b : db.bottle || !b.bottle ? db : { ...db, bottle: b.bottle }
  }
  return [...bundled.map(replace), ...[...fromDb.values()].filter((b) => !known.has(b.id))]
}

export function readCachedRows(): CatalogRow[] {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    const parsed = raw ? (JSON.parse(raw) as { v?: unknown; rows?: unknown }) : null
    return parsed?.v === CATALOG_VERSION && Array.isArray(parsed.rows) ? (parsed.rows as CatalogRow[]) : []
  } catch {
    return []
  }
}

function writeCachedRows(rows: CatalogRow[]): void {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify({ v: CATALOG_VERSION, rows }))
  } catch {
    /* private mode – the bundled JSON it is */
  }
}

/**
 * Fetches the published rows and caches them for the next start. Plain fetch (no supabase-js),
 * anonymous, read-only. Returns false if nothing changed or the request failed.
 */
export async function refreshCatalog(fetchFn: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchFn(`${SUPABASE_URL}/rest/v1/beers?select=id,data,sort&published=eq.true&order=sort.asc,id.asc`, {
      headers: { apikey: SUPABASE_KEY },
    })
    if (!res.ok) return false
    const rows = (await res.json()) as unknown
    if (!Array.isArray(rows)) return false
    const clean = rows.filter((r): r is CatalogRow => !!r && typeof r === 'object' && typeof r.id === 'string' && typeof r.sort === 'number')
    if (JSON.stringify(clean) === JSON.stringify(readCachedRows())) return false
    writeCachedRows(clean)
    return true
  } catch {
    return false
  }
}
