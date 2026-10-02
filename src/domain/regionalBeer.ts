import { COPY, fill, pick } from '../data/copy'
import { hashId } from './hash'
import type { PlaceCountry } from './postcode'
import { STYLE_PROFILES, styleColor, styleProfile, tasteFromStyle } from './styleProfile'
import type { Beer, Pack } from './types'

/**
 * Regional breweries and their main beers as the API delivers them (tables `breweries` +
 * `regional_beers`, Stufe R), checked field by field, and turned into the app's `Beer`.
 * Taste only via `tasteFromStyle` – never invented. Kept free of the catalogue module so
 * `data/beers.ts` can rebuild remembered regional beers at start-up.
 */

export type Country = PlaceCountry
const COUNTRIES: readonly unknown[] = ['DE', 'AT', 'CH', 'CA', 'US'] satisfies Country[]
/** OSM, Wikidata or app ids, or an Open Brewery DB UUID (N4). */
const BREWERY_ID = /^((osm-[nwr]|wd-q|app-)[0-9]{1,20}|obdb-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

export interface RegionalBeerRow {
  id: string
  name: string
  /** Canonical style of styleProfile.ts, null = unknown. */
  style: string | null
  abv: number | null
  pack: Pack | null
  rank: number
  /** beer_sources.id */
  source: number
  source_ref: string | null
}

export interface RegionalBrewery {
  id: string
  name: string
  lat: number
  lon: number
  city: string | null
  postcode: string | null
  country: Country
  website: string | null
  founded: number | null
  /** Main beers, most typical first. */
  beers: RegionalBeerRow[]
}

/** beer_sources (migration 20261001150000): fixed rows, so the client knows them without asking. */
const SOURCES: Record<number, { name: string; url?: (ref: string) => string }> = {
  1: { name: 'Open Food Facts', url: (ref) => `https://world.openfoodfacts.org/product/${encodeURIComponent(ref)}` },
  2: { name: 'Wikidata', url: (ref) => `https://www.wikidata.org/wiki/${encodeURIComponent(ref)}` },
  3: { name: COPY.regional.sourceWebsite },
  4: { name: 'beer.db (openbeer)', url: (ref) => `https://github.com/openbeer/${ref}` },
  // R6: reported in the app and approved; the ref is the link given with the report
  5: { name: COPY.regional.sourceApp, url: (ref) => safeUrl(ref) ?? '' },
}

const COUNTRY_NAME: Record<Country, string> = COPY.countries

const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null)
const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'string' ? Number(v) : v // numeric columns may come back as strings
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : null
}

/** Only http(s) links leave the app. */
export function safeUrl(v: unknown): string | null {
  const s = text(v, 300)
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

function sanitizePack(v: unknown): Pack | null {
  if (!v || typeof v !== 'object') return null
  const p = v as Record<string, unknown>
  const out: Pack = {}
  const ml = num(p.ml, 100, 5000)
  if (ml) out.ml = ml
  if (p.can === true) out.can = true
  if (p.swing === true) out.swing = true
  return Object.keys(out).length ? out : null
}

export function sanitizeBeerRow(v: unknown): RegionalBeerRow | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  const id = typeof r.id === 'string' && /^r-[a-z0-9]{2,40}$/.test(r.id) ? r.id : null
  const name = text(r.name, 200)
  const source = num(r.source, 1, 999)
  if (!id || !name || source === null) return null
  return {
    id,
    name,
    style: text(r.style, 40),
    abv: num(r.abv, 0, 20),
    pack: sanitizePack(r.pack),
    rank: num(r.rank, 0, 99) ?? 0,
    source,
    source_ref: text(r.source_ref, 300),
  }
}

/** A brewery row (with embedded `regional_beers`) or null if anything the app relies on is off. */
export function sanitizeBrewery(v: unknown): RegionalBrewery | null {
  if (!v || typeof v !== 'object') return null
  const b = v as Record<string, unknown>
  const id = typeof b.id === 'string' && BREWERY_ID.test(b.id) ? b.id : null
  const name = text(b.name, 200)
  const lat = num(b.lat, -90, 90)
  const lon = num(b.lon, -180, 180)
  const country = COUNTRIES.includes(b.country) ? (b.country as Country) : null
  if (!id || !name || lat === null || lon === null || !country) return null
  const rows = Array.isArray(b.regional_beers) ? b.regional_beers : Array.isArray(b.beers) ? b.beers : []
  const beers = rows
    .map(sanitizeBeerRow)
    .filter((r): r is RegionalBeerRow => !!r)
    .sort((x, y) => x.rank - y.rank || x.id.localeCompare(y.id))
  return {
    id,
    name,
    lat,
    lon,
    city: text(b.city, 120),
    postcode: text(b.postcode, 12),
    country,
    website: safeUrl(b.website),
    founded: num(b.founded, 800, 2100),
    beers,
  }
}

/** Link to where the beer's facts come from; website beers point at the page they were read from. */
export function sourceUrl(row: RegionalBeerRow, brewery: Pick<RegionalBrewery, 'website'>): string | undefined {
  const src = SOURCES[row.source]
  if (row.source === 3) {
    if (!brewery.website) return undefined
    const path = row.source_ref?.startsWith('/') ? row.source_ref : '/'
    try {
      return new URL(path, brewery.website).href
    } catch {
      return undefined
    }
  }
  return (src?.url && row.source_ref && src.url(row.source_ref)) || undefined
}

/** The regional beer as an app `Beer`: taste, colour and bottle all follow from style, ABV and container. */
export function toRegionalBeer(row: RegionalBeerRow, brewery: Omit<RegionalBrewery, 'beers'>): Beer {
  const known = row.style && Object.hasOwn(STYLE_PROFILES, row.style) ? row.style : null
  const style = known ?? COPY.regional.unknownStyle
  const place = brewery.city ?? COUNTRY_NAME[brewery.country]
  const url = sourceUrl(row, brewery)
  return {
    id: row.id,
    name: row.name,
    fullName: row.name,
    brewery: brewery.name,
    country: COUNTRY_NAME[brewery.country],
    region: place,
    abv: row.abv ?? styleProfile(known).abv,
    style,
    taste: tasteFromStyle(known, row.abv),
    description: fill(known ? COPY.regional.description : COPY.regional.descriptionNoStyle, { style, brewery: brewery.name, place }),
    humorousBio: fill(pick(COPY.regional.bios, hashId(row.id)), { place }),
    tags: [],
    color: styleColor(known),
    ...(row.pack ? { pack: row.pack } : {}),
    ...(brewery.founded ? { founded: brewery.founded } : {}),
    regional: { breweryId: brewery.id, source: SOURCES[row.source]?.name ?? COPY.regional.openData, ...(url ? { sourceUrl: url } : {}) },
  }
}
