// Regional catalogue (R1): raw OSM / Wikidata / Open Food Facts / GeoNames rows → breweries, their main
// beers and postcodes, plus the idempotent import SQL. Pure and deterministic – build.ts does the I/O.
import { parsePack } from '../../src/domain/bottles/pack'
import { normalizeStyle, STYLE_PROFILES } from '../../src/domain/styleProfile'
import type { Pack } from '../../src/domain/types'

export type Country = 'DE' | 'AT' | 'CH'
export const COUNTRIES: readonly Country[] = ['DE', 'AT', 'CH']

/** raw/osm-XX.json (fetch-osm.mjs) */
export interface OsmRow {
  id: string
  name: string | null
  lat: number
  lon: number
  city: string | null
  postcode: string | null
  country: string | null
  website: string | null
  beers?: string[]
  wikidata?: string | null
}

/** raw/wikidata-XX.json (fetch-wikidata.mjs) */
export interface WikidataRow {
  id: string
  name: string | null
  lat: number
  lon: number
  country: string | null
  website: string | null
  dissolved: boolean
  founded?: number | null
  city?: string | null
}

/** raw/wikidata-beers.json (fetch-wikidata.mjs --beers): beers whose manufacturer is a brewery item */
export interface WikidataBeerRow {
  id: string
  name: string | null
  brewery: string
  /** label + municipality of the brewery item – for breweries Wikidata has no coordinates for */
  breweryName?: string | null
  breweryPlace?: string | null
  abv: number | null
  /** labels of „instance of“ (e.g. „Pils“, „Weizenbier“) – style hints */
  kinds: string[]
}

/** raw/off-XX.json (fetch-off.mjs) */
export interface OffRow {
  code: string
  name: string | null
  brands: string | null
  owner: string | null
  places: string | null
  abv: number | null
  categories: string[]
  labels: string[]
  quantity: string | null
  packaging?: string | null
}

export interface Brewery {
  id: string
  name: string
  lat: number
  lon: number
  city: string | null
  postcode: string | null
  country: Country
  website: string | null
  founded: number | null
  sources: string[]
  /** Wikidata item (Q…) – links Wikidata beers; not stored */
  qid: string | null
}

/** beer_sources.id */
export const SOURCE = { off: 1, wikidata: 2, web: 3, openbeer: 4 } as const

export interface RegionalBeer {
  id: string
  breweryId: string
  name: string
  style: string | null
  abv: number | null
  pack: Pack | null
  rank: number
  source: number
  /** EAN, Q-id or website path */
  sourceRef: string
}

export interface Place {
  country: Country
  postcode: string
  name: string
  lat: number
  lon: number
}

// ---------------------------------------------------------------------------------------------
// names and distances
// ---------------------------------------------------------------------------------------------

const LEGAL = /\b(gmbh|ag|kg|co|ohg|eg|e\.?\s?k|mbh|ug|haftungsbeschraenkt|sarl|sa)\b/g
const FILLER =
  /\b(privat|privatbrauerei|familienbrauerei|brauerei|brauereigasthof|brauereigaststaette|brauhaus|hausbrauerei|braeu|braeuhaus|brau|bier|biere|beer|brewery|brewing|brew|craft|gasthaus|gasthof|wirtshaus|und|the|der|die|das|zum|zur|zu|am|im|von|st)\b/g

/** Lower-case, no umlaut variants, no legal forms / filler words – for name matching. */
export function normName(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(LEGAL, ' ')
    .replace(FILLER, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Distinctive name tokens (≥ 4 letters). */
const tokens = (s: unknown) => normName(s).split(' ').filter((t) => t.length >= 4)

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const text = (s: string | null | undefined, max: number) => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : null
}

function website(s: string | null | undefined): string | null {
  const t = text(s, 300)
  if (!t || /\s/.test(t)) return null
  if (/^https?:\/\//i.test(t)) return t
  return /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t) ? `https://${t}` : null
}

const asCountry = (c: string | null | undefined, fallback: Country): Country =>
  (COUNTRIES as readonly string[]).includes(c?.toUpperCase() ?? '') ? (c!.toUpperCase() as Country) : fallback

/** osm:n123 → osm-n123, wd:Q123 → wd-q123 (the charset of ratings.beer_id / breweries.id). */
export const breweryId = (sourceId: string) => sourceId.toLowerCase().replace(':', '-')

// ---------------------------------------------------------------------------------------------
// breweries: OSM first, Wikidata merged in by wikidata tag or same name < 500 m
// ---------------------------------------------------------------------------------------------

export function mergeBreweries(osm: Record<Country, OsmRow[]>, wikidata: Record<Country, WikidataRow[]>): Brewery[] {
  const out: (Brewery & { key: string })[] = []
  const byKey = new Map<string, (typeof out)[number][]>()
  const add = (b: (typeof out)[number]) => {
    out.push(b)
    byKey.set(b.key, [...(byKey.get(b.key) ?? []), b])
  }
  const near = (key: string, p: { lat: number; lon: number }, km: number) =>
    byKey.get(key)?.find((b) => haversineKm(b, p) < km)

  for (const c of COUNTRIES) {
    for (const o of osm[c] ?? []) {
      const name = text(o.name, 200)
      if (!name || !Number.isFinite(o.lat) || !Number.isFinite(o.lon)) continue
      const key = normName(name)
      // the same brewery mapped twice (node + building) or in two country files
      if (near(key, o, 0.3)) continue
      add({
        id: breweryId(o.id),
        name,
        lat: o.lat,
        lon: o.lon,
        city: text(o.city, 120),
        postcode: text(o.postcode, 12),
        country: asCountry(o.country, c),
        website: website(o.website),
        founded: null,
        sources: ['osm'],
        key,
        qid: o.wikidata && /^Q\d+$/.test(o.wikidata) ? o.wikidata : null,
      })
    }
  }
  const byQid = new Map(out.filter((b) => b.qid).map((b) => [b.qid!, b]))
  for (const c of COUNTRIES) {
    for (const w of wikidata[c] ?? []) {
      const name = text(w.name, 200)
      if (!name || w.dissolved || !Number.isFinite(w.lat) || !Number.isFinite(w.lon)) continue
      const key = normName(name)
      const founded = w.founded && w.founded >= 800 && w.founded <= 2100 ? w.founded : null
      const hit = byQid.get(w.id.replace(/^wd:/, '')) ?? near(key, w, 0.5)
      if (hit) {
        if (!hit.sources.includes('wikidata')) hit.sources.push('wikidata')
        hit.qid ??= w.id.replace(/^wd:/, '')
        hit.website ??= website(w.website)
        hit.founded ??= founded
        hit.city ??= text(w.city, 120)
        continue
      }
      add({
        id: breweryId(w.id),
        name,
        lat: w.lat,
        lon: w.lon,
        city: text(w.city, 120),
        postcode: null,
        country: asCountry(w.country, c),
        website: website(w.website),
        founded,
        sources: ['wikidata'],
        key,
        qid: w.id.replace(/^wd:/, ''),
      })
    }
  }
  return out.map(({ key: _key, ...b }) => b).sort((a, b) => a.id.localeCompare(b.id))
}

// ---------------------------------------------------------------------------------------------
// beers → brewery: every name token of the brewery must be in brands/owner
// ---------------------------------------------------------------------------------------------

export function breweryMatcher(breweries: Brewery[]) {
  const info = new Map(breweries.map((b) => [b, { key: normName(b.name), toks: new Set(tokens(b.name)) }]))
  const byToken = new Map<string, Brewery[]>()
  for (const [b, { toks }] of info) for (const t of toks) byToken.set(t, [...(byToken.get(t) ?? []), b])

  return (p: Pick<OffRow, 'brands' | 'owner' | 'places'>): Brewery | null => {
    const hay = new Set([...tokens(p.brands), ...tokens(p.owner)])
    if (!hay.size) return null
    const cands = new Set<Brewery>()
    for (const t of hay) for (const b of byToken.get(t) ?? []) cands.add(b)
    let best: { b: Brewery; score: number } | null = null
    for (const b of cands) {
      const { toks } = info.get(b)!
      // „Löwenbräu“ alone does not match „Haller Löwenbräu“
      if (![...toks].every((t) => hay.has(t))) continue
      let score = [...hay].filter((t) => toks.has(t)).length / toks.size
      // manufacturing place = brewery city: decides between same-named breweries („Adler“, „Hirsch“)
      if (p.places && b.city && normName(p.places).includes(normName(b.city))) score += 1
      if (!best || score > best.score || (score === best.score && b.id < best.b.id)) best = { b, score }
    }
    if (!best) return null
    const key = info.get(best.b)!.key
    const sameName = [...cands].filter((b) => info.get(b)!.key === key).length
    return sameName > 1 && best.score < 1.5 ? null : best.b
  }
}

// ---------------------------------------------------------------------------------------------
// main beers: one per style, at most five per brewery
// ---------------------------------------------------------------------------------------------

export const MAX_BEERS_PER_BREWERY = 5

/** Styles that are rarely what a brewery is known for – they come after the others. */
const SIDE_STYLES = new Set(['Radler', 'Alkoholfrei', 'Alkoholfreies Weißbier'])
const STYLE_ORDER = Object.keys(STYLE_PROFILES)

/** „Krombacher Pils 0,33l Flasche“ → „Krombacher Pils“. */
export function cleanBeerName(name: string): string {
  const t = name
    .replace(/\b\d+\s*[x×]\s*/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:l|ml|cl|liter|litre)\b\.?/gi, ' ')
    .replace(/\b(?:flasche|flaschen|dose|dosen|mehrweg|einweg|kasten|kiste|sixpack|six-pack|\d+er[ -]?pack|pack|bottle|can)\b/gi, ' ')
    .replace(/[()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–,/|:.]+|[\s\-–,/|:.]+$/g, '')
  return (t || name.trim()).slice(0, 200)
}

interface Candidate {
  /** row id without the „r-“ */
  code: string
  name: string
  style: string | null
  abv: number | null
  pack: Pack | null
  source?: number
  sourceRef?: string
}

const completeness = (c: Candidate) => (c.abv != null ? 1 : 0) + (c.pack ? 1 : 0)

/**
 * The beers a brewery stands for: candidates grouped by style, the most complete entry with the
 * shortest name per style (sizes and packs of one beer collapse into one), styles with more entries
 * first, Radler/alcohol-free last, unknown style only when nothing else is known.
 */
export function pickMainBeers(cands: Candidate[], max = MAX_BEERS_PER_BREWERY): Candidate[] {
  const groups = new Map<string, Candidate[]>()
  for (const c of cands) groups.set(c.style ?? '', [...(groups.get(c.style ?? '') ?? []), c])
  const order = (s: string) => (s === '' ? 2 : SIDE_STYLES.has(s) ? 1 : 0)
  const styles = [...groups.keys()]
    .filter((s) => s !== '' || groups.size === 1)
    .sort(
      (a, b) =>
        order(a) - order(b) ||
        groups.get(b)!.length - groups.get(a)!.length ||
        STYLE_ORDER.indexOf(a) - STYLE_ORDER.indexOf(b),
    )
  const seenNames = new Set<string>()
  const out: Candidate[] = []
  for (const s of styles) {
    const g = [...groups.get(s)!].sort(
      (a, b) => completeness(b) - completeness(a) || a.name.length - b.name.length || a.code.localeCompare(b.code),
    )
    const best = { ...g[0] }
    // fill gaps from the other sizes of the same beer
    best.abv ??= g.find((c) => c.abv != null)?.abv ?? null
    best.pack ??= g.find((c) => c.pack)?.pack ?? null
    const k = normName(best.name)
    if (seenNames.has(k)) continue
    seenNames.add(k)
    out.push(best)
    if (out.length >= max) break
  }
  return out
}

const NOT_A_BEER = /brauerei|unternehmen|gewerbebetrieb|marke(nzeichen)?$/i

/**
 * Open Food Facts products and Wikidata beers → main beers of the matched breweries (unmatched products
 * are dropped). Both sources compete per style; Open Food Facts usually wins on completeness (pack).
 */
export function mainBeers(off: OffRow[], breweries: Brewery[], wdBeers: WikidataBeerRow[] = []): RegionalBeer[] {
  const match = breweryMatcher(breweries)
  const perBrewery = new Map<string, Candidate[]>()
  const add = (breweryId: string, c: Candidate) => perBrewery.set(breweryId, [...(perBrewery.get(breweryId) ?? []), c])
  const byQid = new Map(breweries.filter((b) => b.qid).map((b) => [b.qid!, b]))
  const seen = new Set<string>()
  for (const p of off) {
    const name = text(p.name, 200)
    if (!name || !/^[0-9]{4,20}$/.test(p.code) || seen.has(p.code)) continue
    seen.add(p.code)
    const b = match(p)
    if (!b) continue
    const abv = p.abv != null && p.abv >= 0 && p.abv <= 20 ? Math.round(p.abv * 10) / 10 : null
    add(b.id, {
      code: p.code,
      name: cleanBeerName(name),
      style: normalizeStyle([name, p.categories.join(' '), p.labels.join(' ')], abv),
      abv,
      pack: parsePack(p.quantity, p.packaging) ?? null,
      source: SOURCE.off,
      sourceRef: p.code,
    })
  }
  for (const w of wdBeers) {
    const qid = w.id.replace(/^wd:/, '')
    const name = text(w.name, 200)
    const b =
      byQid.get(w.brewery.replace(/^wd:/, '')) ??
      (w.breweryName ? match({ brands: w.breweryName, owner: null, places: w.breweryPlace ?? null }) : null)
    if (!name || !b || !/^Q\d+$/.test(qid) || /^Q\d+$/.test(name)) continue
    // brand and company items („Biermarke“, „Brauerei“) are not a single beer
    if (w.kinds.some((k) => NOT_A_BEER.test(k))) continue
    const abv = w.abv != null && w.abv >= 0 && w.abv <= 20 ? Math.round(w.abv * 10) / 10 : null
    add(b.id, {
      code: qid.toLowerCase(),
      name,
      style: normalizeStyle([name, ...w.kinds], abv),
      abv,
      pack: null,
      source: SOURCE.wikidata,
      sourceRef: qid,
    })
  }
  const out: RegionalBeer[] = []
  for (const [breweryId, cands] of [...perBrewery].sort((a, b) => a[0].localeCompare(b[0])))
    pickMainBeers(cands).forEach((c, rank) =>
      out.push({
        id: `r-${c.code}`,
        breweryId,
        name: c.name,
        style: c.style,
        abv: c.abv,
        pack: c.pack,
        rank,
        source: c.source ?? SOURCE.off,
        sourceRef: c.sourceRef ?? c.code,
      }),
    )
  return out
}

// ---------------------------------------------------------------------------------------------
// GeoNames postcodes (TSV: country, postcode, place, admin…, lat, lon, accuracy)
// ---------------------------------------------------------------------------------------------

export function parsePlaces(tsv: string, country: Country): Place[] {
  const out = new Map<string, Place>()
  for (const line of tsv.split('\n')) {
    const f = line.split('\t')
    if (f.length < 11 || f[0] !== country) continue
    const postcode = f[1].trim()
    const name = text(f[2], 120)
    const lat = Number(f[9])
    const lon = Number(f[10])
    if (!/^[0-9]{4,5}$/.test(postcode) || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const k = `${postcode}|${name}`
    if (!out.has(k)) out.set(k, { country, postcode, name, lat: round(lat, 4), lon: round(lon, 4) })
  }
  return [...out.values()]
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

// ---------------------------------------------------------------------------------------------
// import SQL: idempotent upserts in batches, then unpublish what the sources no longer have
// ---------------------------------------------------------------------------------------------

const lit = (v: unknown): string => {
  if (v == null) return 'null'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null'
  if (typeof v === 'boolean') return String(v)
  return `'${String(v).replace(/\0/g, '').replace(/'/g, "''")}'`
}
const arr = (xs: string[]) => `${lit(`{${xs.map((x) => `"${x.replace(/["\\]/g, '')}"`).join(',')}}`)}::text[]`
const chunks = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

function upsert(table: string, cols: string[], key: string[], rows: string[][]): string {
  const set = cols.filter((c) => !key.includes(c))
  return (
    `insert into public.${table} (${cols.join(', ')}) values\n` +
    rows.map((r) => `  (${r.join(', ')})`).join(',\n') +
    `\non conflict (${key.join(', ')}) do update set ${set.map((c) => `${c} = excluded.${c}`).join(', ')}\n` +
    // untouched rows keep their updated_at
    `  where (${set.map((c) => `${table}.${c}`).join(', ')}) is distinct from (${set.map((c) => `excluded.${c}`).join(', ')});\n`
  )
}

export interface ImportFile {
  name: string
  sql: string
}

/** Import SQL as ordered files (each one transaction, small enough for `supabase db query`). */
export function importSql(breweries: Brewery[], beers: RegionalBeer[], places: Place[], batch = 500): ImportFile[] {
  const files: ImportFile[] = []
  const pad = (i: number) => String(i + 1).padStart(3, '0')
  const tx = (sql: string) => `begin;\n${sql}commit;\n`
  chunks(breweries, batch).forEach((rows, i) =>
    files.push({
      name: `10-breweries-${pad(i)}.sql`,
      sql: tx(
        upsert(
          'breweries',
          ['id', 'name', 'lat', 'lon', 'city', 'postcode', 'country', 'website', 'founded', 'sources', 'published'],
          ['id'],
          rows.map((b) => [
            lit(b.id), lit(b.name), lit(round(b.lat, 6)), lit(round(b.lon, 6)), lit(b.city), lit(b.postcode),
            lit(b.country), lit(b.website), lit(b.founded), arr(b.sources), 'true',
          ]),
        ),
      ),
    }),
  )
  chunks(beers, batch).forEach((rows, i) =>
    files.push({
      name: `20-beers-${pad(i)}.sql`,
      sql: tx(
        upsert(
          'regional_beers',
          ['id', 'brewery_id', 'name', 'style', 'abv', 'pack', 'rank', 'source', 'source_ref', 'published'],
          ['id'],
          rows.map((b) => [
            lit(b.id), lit(b.breweryId), lit(b.name), lit(b.style), lit(b.abv),
            b.pack ? `${lit(JSON.stringify(b.pack))}::jsonb` : 'null', lit(b.rank), lit(b.source), lit(b.sourceRef), 'true',
          ]),
        ),
      ),
    }),
  )
  files.push({
    name: '30-unpublish.sql',
    sql: tx(
      `update public.regional_beers set published = false where published and id <> all(${arr(beers.map((b) => b.id))});\n` +
        `update public.breweries set published = false where published and id <> all(${arr(breweries.map((b) => b.id))});\n`,
    ),
  })
  chunks(places, batch * 2).forEach((rows, i) =>
    files.push({
      name: `40-places-${pad(i)}.sql`,
      sql: tx(
        upsert(
          'places',
          ['country', 'postcode', 'name', 'lat', 'lon'],
          ['country', 'postcode', 'name'],
          rows.map((p) => [lit(p.country), lit(p.postcode), lit(p.name), lit(p.lat), lit(p.lon)]),
        ),
      ),
    }),
  )
  return files
}
