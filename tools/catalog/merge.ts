// Regional catalogue (R1, N5): raw OSM / Wikidata / Open Brewery DB / Open Food Facts / GeoNames rows → breweries,
// their main beers and postcodes, plus the idempotent import SQL. Pure and deterministic – build.ts does the I/O.
import { parsePack } from '../../src/domain/bottles/pack'
import { parsePostcode } from '../../src/domain/postcode'
import { normalizeStyle, STYLE_PROFILES } from '../../src/domain/styleProfile'
import { checkAbv } from './plausible'
import { styleOnly } from './web'
import type { PlausibilityNote } from './plausible'
import type { ResearchRow } from './research'
import type { Pack } from '../../src/domain/types'
import COUNTRY_TABLE from './countries.json'

/** countries.json – shared with the fetch scripts (lib.mjs) */
export type Country = keyof typeof COUNTRY_TABLE
export const COUNTRIES = Object.keys(COUNTRY_TABLE) as Country[]
export const COUNTRY_INFO: Record<Country, { lang: string; minBreweries: number }> = COUNTRY_TABLE

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
  /** V10: website of the brewery item – finds the brewery when the item has no coordinates and the name is ambiguous */
  breweryWebsite?: string | null
  abv: number | null
  /** labels of „instance of“ (e.g. „Pils“, „Weizenbier“) – style hints */
  kinds: string[]
}

/** One beer of an openbeer/beer.db text file (parseOpenbeer). */
export interface OpenbeerRow {
  /** file in the repo, e.g. „oberbayern/blob/master/1--muenchen/beers.txt“ */
  ref: string
  brewery: string
  city: string | null
  name: string
  abv: number | null
  /** style tags („maerzen|festbier“, „weisse_dunkel“, „Alkoholfrei“) */
  styles: string
}

/** raw/obdb-XX.json (fetch-obdb.mjs): Open Brewery DB, coordinates missing for some rows */
export interface ObdbRow {
  id: string
  name: string | null
  lat: number | null
  lon: number | null
  city: string | null
  postcode: string | null
  website: string | null
}

/** raw/web-N.json (crawl.ts): a beer found on the brewery's own website */
export interface WebRow {
  breweryId: string
  /** path of the page on the brewery website */
  path: string
  name: string
  abv: number | null
  /** V12: the style a researched page gives */
  style?: string | null
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
  /** V10: the catalogue countries it is sold in (the off-XX.json files naming it) */
  countries?: Country[]
  /** V10: sold only outside the catalogue countries (raw/off-other.json) – counts only with the exact brewery name */
  abroad?: boolean
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
  /** other names (a differing Wikidata label) – for matching only, not stored */
  aliases?: string[]
}

/** beer_sources.id */
export const SOURCE = { off: 1, wikidata: 2, web: 3, openbeer: 4, research: 6 } as const
/** On a tie, the more current source wins (openbeer is from ~2014). */
const SOURCE_PRIORITY: Record<number, number> = { 1: 0, 2: 1, 3: 2, 6: 3, 4: 4 }

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
  /** V1: how well the beer is backed – see beerQuality() */
  quality: Quality
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

const LEGAL = /\b(gmbh|ag|kg|co|ohg|eg|e\.?\s?k|mbh|ug|haftungsbeschraenkt|sarl|sa|inc|llc|ltd|ltee|corp|company|limited)\b/g
const FILLER =
  /\b(privat|privatbrauerei|familienbrauerei|brauerei|brauereigasthof|brauereigaststaette|brauhaus|hausbrauerei|braeu|braeuhaus|brau|bier|biere|bieres|beer|beers|pivo|birra|cerveza|brewery|breweries|brewing|brew|brewpub|brewhouse|brewers|taproom|ales|microbrasserie|brasserie|brasseurs|craft|blending|gasthaus|gasthof|wirtshaus|und|and|the|of|les|des|aux|der|die|das|zum|zur|zu|am|im|von|st)\b/g

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

/** The place adjective „-er“ → the place („Zwettler“ → „Zwettl“, „Gösser“ → „Göss“, „Haller“ → „Hall“). */
const stem = (t: string) => (t.length > 5 && t.endsWith('er') ? t.slice(0, -2) : t)

/** Name words for matching: ≥ 3 letters or a number – „Flying Dog“ is not „Flying Monkeys“, „Mill 77“ not „Miller“. */
const words = (s: unknown) => normName(s).split(' ').filter((t) => t.length >= 3 || /^\d+$/.test(t))

/** Distinctive tokens (≥ 4 letters) with the „-er“ adjective as its place – for beer names, either form on both sides. */
const tokens = (s: unknown) => normName(s).split(' ').map(stem).filter((t) => t.length >= 4)

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
// breweries: OSM first, Wikidata merged in by wikidata tag or same name < 500 m, then Open Brewery DB by name
// ---------------------------------------------------------------------------------------------

/** Centre of a postcode (all GeoNames places with it) – for Open Brewery DB rows without coordinates. */
function postcodeCentres(places: Place[]): Map<string, { lat: number; lon: number }> {
  const sum = new Map<string, { lat: number; lon: number; n: number }>()
  for (const p of places) {
    const k = `${p.country}|${p.postcode}`
    const s = sum.get(k) ?? { lat: 0, lon: 0, n: 0 }
    sum.set(k, { lat: s.lat + p.lat, lon: s.lon + p.lon, n: s.n + 1 })
  }
  return new Map([...sum].map(([k, s]) => [k, { lat: round(s.lat / s.n, 4), lon: round(s.lon / s.n, 4) }]))
}

export function mergeBreweries(
  osm: Partial<Record<Country, OsmRow[]>>,
  wikidata: Partial<Record<Country, WikidataRow[]>>,
  obdb: Partial<Record<Country, ObdbRow[]>> = {},
  places: Place[] = [],
): Brewery[] {
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
        if (key !== hit.key) hit.aliases = [...(hit.aliases ?? []), name]
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
  const centres = postcodeCentres(places)
  for (const c of COUNTRIES) {
    for (const o of obdb[c] ?? []) {
      const name = text(o.name, 200)
      const uuid = o.id.replace(/^obdb:/, '')
      if (!name || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)) continue
      const hasCoords = o.lat != null && o.lon != null && Number.isFinite(o.lat) && Number.isFinite(o.lon) && !(o.lat === 0 && o.lon === 0)
      const code = parsePostcode(o.postcode ?? '')
      const at = hasCoords ? { lat: o.lat!, lon: o.lon! } : code ? centres.get(`${c}|${code}`) : undefined
      if (!at) continue
      const key = normName(name)
      // a postcode centre is a few km off – the name has to carry the match there
      const hit = near(key, at, hasCoords ? 1 : 5)
      if (hit) {
        if (!hit.sources.includes('obdb')) hit.sources.push('obdb')
        hit.website ??= website(o.website)
        hit.city ??= text(o.city, 120)
        hit.postcode ??= text(o.postcode, 12)
        continue
      }
      add({
        id: breweryId(`obdb:${uuid}`),
        name,
        lat: at.lat,
        lon: at.lon,
        city: text(o.city, 120),
        postcode: text(o.postcode, 12),
        country: c,
        website: website(o.website),
        founded: null,
        sources: ['obdb'],
        key,
        qid: null,
      })
    }
  }
  return out.map(({ key: _key, ...b }) => b).sort((a, b) => a.id.localeCompare(b.id))
}

/** Countries with fewer breweries than a complete download has – a broken download must not unpublish them. */
export function tooFew(breweries: Brewery[], min?: number): string[] {
  const n = (c: Country) => breweries.filter((b) => b.country === c).length
  return COUNTRIES.filter((c) => n(c) < (min ?? COUNTRY_INFO[c].minBreweries)).map(
    (c) => `${c}: ${n(c)} < ${min ?? COUNTRY_INFO[c].minBreweries}`,
  )
}

/**
 * V12: a brewery only Wikidata knows, without website and without any beer, is not confirmed – mostly listed
 * buildings („Brauerei Rote Straße 10 in Zirndorf (D-5-73-134-39#9)“) or long-gone breweries; it is not published.
 */
export function confirmedBreweries(breweries: Brewery[], beers: readonly { breweryId: string }[]): Brewery[] {
  const withBeer = new Set(beers.map((b) => b.breweryId))
  return breweries.filter((b) => withBeer.has(b.id) || b.website || b.sources.some((s) => s !== 'wikidata'))
}

// ---------------------------------------------------------------------------------------------
// beers → brewery: every name token of the brewery must be in brands/owner
// ---------------------------------------------------------------------------------------------

/** Words many breweries share – a name made only of these („Hofbräu“, „Die Weisse“) needs the place. */
const GENERIC = new Set(
  'klosterbrauerei schlossbrauerei stadtbrauerei landbrauerei bierbrauerei burgbrauerei dorfbrauerei hofbrauerei gutsbrauerei klosterbraeu hofbraeu hofbraeuhaus hofbrauhaus weisse weissbraeu weissbierbrauerei union koenig braeustueberl braeustuebl braeustuben bierhaus brauwerk braumanufaktur biermanufaktur manufaktur kloster schloss stadt'.split(
    ' ',
  ),
)
const isGeneric = (names: Iterable<string>) => [...names].every((t) => GENERIC.has(t) || GENERIC.has(stem(t)))

/** Hosts many breweries share (social pages, link lists) – they say nothing about which brewery it is. */
const SHARED_HOSTS = /(^|\.)(facebook|instagram|twitter|x|untappd|linktr|linktree|yelp|google|tripadvisor|beeradvocate|ratebeer)\.[a-z.]+$|^sites\.google\.com$/

/** V10: the website as a key – host without „www.“; null for shared hosts. */
export function siteKey(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '')
    return host.includes('.') && !SHARED_HOSTS.test(host) ? host : null
  } catch {
    return null
  }
}

/**
 * V10: same-named entries that are one company (taprooms, sites, a node and a building of one brewery) → its main
 * entry; null when they may be different breweries („Adler“ in Dettingen and in Bonndorf). One company: every entry
 * with a website has the same one, and either two entries share it or exactly one is a Wikidata item. The main entry:
 * the Wikidata item, else the shortest website (the home page, not „/raleigh“).
 */
export function oneCompany(group: readonly Brewery[]): Brewery | null {
  if (group.length === 1) return group[0]
  const sites = group.map((b) => siteKey(b.website))
  const known = new Set(sites.filter(Boolean))
  const withQid = group.filter((b) => b.qid)
  if (known.size > 1 || withQid.length > 1) return null
  if (withQid.length === 1) return withQid[0]
  if (sites.filter(Boolean).length < 2) return null
  return [...group]
    .filter((b) => siteKey(b.website))
    .sort((a, b) => a.website!.length - b.website!.length || a.id.localeCompare(b.id))[0]
}

/**
 * V10: a full brewery name word for word – whole words and numbers, no „-er“ stem: „Pizza Port“ is not „Porter Pizza“,
 * „450 North“ not „32 North“, „Kane Brewing“ not „Kane's“.
 */
const exactKey = (s: unknown, drop: ReadonlySet<string> = new Set()) =>
  [...new Set(normName(String(s ?? '').replace(/['’]s\b/gi, 's')).split(' '))]
    .filter((w) => (w.length >= 3 || /^\d+$/.test(w)) && !drop.has(w))
    .sort()
    .join(' ')

export function breweryMatcher(breweries: Brewery[]) {
  // every name the brewery is known by (OSM name + a different Wikidata label) is a variant; V10: for a brewery with a
  // Wikidata item, the name without its own place as a word of its own, too („Augustiner Bräu München“ in München is
  // „Augustiner“; „Haller Löwenbräu“ stays – the adjective is part of the brand; „Stella Fulda“ is no „Stella“)
  const info = new Map(
    breweries.map((b) => {
      const all = [b.name, ...(b.aliases ?? [])]
      const city = new Set(normName(b.city).split(' '))
      const placeless = (b.qid ? all : [])
        .map((n) => normName(n).split(' '))
        .filter((w) => w.some((t) => city.has(t)))
        .map((w) => new Set(words(w.filter((t) => !city.has(t)).join(' '))))
      return [b, { key: normName(b.name), variants: [...all.map((n) => new Set(words(n))), ...placeless].filter((v) => v.size) }]
    }),
  )
  const byExact = new Map<string, Brewery[]>()
  for (const b of breweries) {
    const city = new Set(normName(b.city).split(' '))
    for (const k of new Set([b.name, ...(b.aliases ?? [])].flatMap((n) => [exactKey(n), exactKey(n, city)])))
      if (k) byExact.set(k, [...(byExact.get(k) ?? []), b])
  }
  const byToken = new Map<string, Brewery[]>()
  for (const [b, { variants }] of info)
    for (const t of new Set(variants.flatMap((v) => [...v]))) byToken.set(t, [...(byToken.get(t) ?? []), b])

  /**
   * strict (full brewery names from lists like openbeer, which name breweries we may not have): the place
   * must match, or the names are the same and we know no place for the brewery – „Hofbräu Kaltenhausen“
   * must not land on „Hofbräu“ in Abensberg.
   * exact (V10: Wikidata brewery names, products sold abroad): the brand is the brewery's name word for word (its
   * place may be missing) – see exactKey.
   */
  return (p: Pick<OffRow, 'brands' | 'owner' | 'places'>, strict = false, exact = false): Brewery | null => {
    const place = normName(p.places)
    const atPlace = (b: Brewery) => !!place && !!b.city && place.includes(normName(b.city))
    if (exact) {
      const hits = (byExact.get(exactKey(p.brands)) ?? []).filter((b) => atPlace(b) || !isGeneric(words(b.name)))
      const here = hits.filter(atPlace)
      return hits.length ? oneCompany(here.length ? here : hits) : null
    }
    // brand words, plus the place of a place adjective: „Zwettler“ finds „Zwettl“ – but only as the whole brand
    // („Berliner Kindl“ is no brewery called „Berlin“), and „Beck's“ never finds „Becker“
    const hay = new Set([...words(p.brands), ...words(p.owner)])
    if (!hay.size) return null
    const hayAll = new Set([...hay, ...[...hay].map(stem)])
    const inBrewery = (toks: Set<string>, t: string) => toks.has(t) || toks.has(stem(t))
    const cands = new Set<Brewery>()
    for (const t of hayAll) for (const b of byToken.get(t) ?? []) cands.add(b)
    let best: { b: Brewery; score: number } | null = null
    for (const b of cands) {
      // manufacturing place = brewery city: decides between same-named breweries („Adler“, „Hirsch“)
      const city = normName(b.city)
      const atPlace = !!place && !!city && place.includes(city)
      for (const toks of info.get(b)!.variants) {
        // „Löwenbräu“ alone does not match „Haller Löwenbräu“ – unless it is made in Schwäbisch Hall
        // („Augustiner Bräu, München“ → „Augustiner-Bräu Wagner“)
        const named = [...toks].every((t) => hay.has(t)) || ([...toks].every((t) => hayAll.has(t)) && [...hay].every((t) => inBrewery(toks, t)))
        const full = named && (!isGeneric(toks) || atPlace)
        // the brand must say more than the place („Berliner“ is not „Craftzentrum Berlin“)
        const short = atPlace && [...hay].every((t) => inBrewery(toks, t)) && [...hay].some((t) => !place.includes(stem(t)))
        if (!full && !short) continue
        if (strict && !atPlace && !(full && toks.size === hay.size && !city)) continue
        let score = [...hay].filter((t) => inBrewery(toks, t)).length / (full ? toks.size : Math.max(toks.size, hay.size))
        if (atPlace) score += 1
        // a tie goes to the Wikidata item (the brewery, not its taproom „Paulaner Bräuhaus“)
        const better = !best || score > best.score || (score === best.score && (Number(!!b.qid) - Number(!!best.b.qid) || best.b.id.localeCompare(b.id)) > 0)
        if (better) best = { b, score }
      }
    }
    if (!best) return null
    const key = info.get(best.b)!.key
    const sameName = [...cands].filter((b) => info.get(b)!.key === key)
    return sameName.length > 1 && best.score < 1.5 ? oneCompany(sameName) : best.b
  }
}

/** V10: breweries by website – a Wikidata beer whose brewery item has no coordinates still names the website. */
export function breweryBySite(breweries: Brewery[]) {
  const bySite = new Map<string, Brewery[]>()
  for (const b of breweries) {
    const k = siteKey(b.website)
    if (k) bySite.set(k, [...(bySite.get(k) ?? []), b])
  }
  return (url: string | null | undefined): Brewery | null => {
    const group = bySite.get(siteKey(url) ?? '')
    return group ? oneCompany(group) : null
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
  /** V10: the name without the brewery's („Augustiner Edelstoff“ = „Edelstoff“) – the same beer in another source */
  twin?: string
  /** V10: the beer exists – Open Food Facts, Wikidata or two sources name it (directly or as a twin) */
  backed?: boolean
}

/** V10: a beer name without the brewery's own name words and pack sizes – equal keys = the same beer. */
export function twinKey(name: string, breweryNames: readonly string[]): string {
  const own = new Set(breweryNames.flatMap(tokens))
  const words = normName(cleanBeerName(name)).split(' ').filter(Boolean)
  const rest = words.filter((w) => !own.has(w.length > 5 && w.endsWith('er') ? w.slice(0, -2) : w))
  return (rest.length ? rest : words).join(' ')
}

const completeness = (c: Candidate) => (c.abv != null ? 1 : 0) + (c.pack ? 1 : 0)

/**
 * The beers a brewery stands for: candidates grouped by style, a real name before a bare style („Hop Drop IPA“
 * before „IPA“), then the most complete entry with the shortest name per style (sizes and packs of one beer collapse into one), styles with more entries
 * first, Radler/alcohol-free last, unknown style only when nothing else is known.
 */
export function pickMainBeers(cands: Candidate[], max = MAX_BEERS_PER_BREWERY): Candidate[] {
  const groups = new Map<string, Candidate[]>()
  for (const c of cands) groups.set(c.style ?? '', [...(groups.get(c.style ?? '') ?? []), c])
  const order = (s: string) => (s === '' ? 2 : SIDE_STYLES.has(s) ? 1 : 0)
  const backed = (s: string) => Number(groups.get(s)!.some((c) => c.backed))
  const styles = [...groups.keys()]
    .filter((s) => s !== '' || groups.size === 1)
    .sort(
      (a, b) =>
        order(a) - order(b) ||
        backed(b) - backed(a) ||
        groups.get(b)!.length - groups.get(a)!.length ||
        STYLE_ORDER.indexOf(a) - STYLE_ORDER.indexOf(b),
    )
  const seenNames = new Set<string>()
  const out: Candidate[] = []
  for (const s of styles) {
    const g = [...groups.get(s)!].sort(
      (a, b) =>
        Number(styleOnly(a.name)) - Number(styleOnly(b.name)) ||
        Number(b.backed ?? false) - Number(a.backed ?? false) ||
        completeness(b) - completeness(a) ||
        SOURCE_PRIORITY[a.source ?? 1] - SOURCE_PRIORITY[b.source ?? 1] ||
        a.name.length - b.name.length ||
        a.code.localeCompare(b.code),
    )
    const best = { ...g[0] }
    // fill gaps from the other sizes of the same beer – one name starts with the other („Hell“, „Hell 0,33“), not
    // just the same style („Hop Drop IPA“ takes no ABV from a bare „IPA“)
    const k = normName(best.name)
    const same = g.filter((c) => normName(c.name).startsWith(k) || k.startsWith(normName(c.name)) || (!!best.twin && c.twin === best.twin))
    best.abv ??= same.find((c) => c.abv != null)?.abv ?? null
    best.pack ??= same.find((c) => c.pack)?.pack ?? null
    // the same beer under two styles in two sources („Lager“ on Wikidata, „Helles“ on the website) counts once
    if (seenNames.has(k) || (best.twin && seenNames.has(`twin:${best.twin}`))) continue
    seenNames.add(k)
    if (best.twin) seenNames.add(`twin:${best.twin}`)
    out.push(best)
    if (out.length >= max) break
  }
  return out
}

const NOT_A_BEER = /brauerei|unternehmen|gewerbebetrieb|marke(nzeichen)?$/i

/**
 * Merchandise, vouchers and other shop items that brewery websites and product lists name like a beer
 * („T-Shirt Schwarz“, „Alt Logo Flat Cap“, „Cardigan Cream Ale Six-Pack“) – a merch word at the start, or one that
 * never names a beer anywhere. „Red Jacket Amber Ale“ or „Sweater Snag Dark Saison“ stay.
 */
const MERCH_START = /^(t-?shirts?|shirts?|hoodies?|pullover|sweatshirts?|m(ü|ue)tzen?|beanies?|caps?|kappen?|tassen?|gutscheine?|vouchers?|gift ?cards?|geschenk\w*|aufkleber|stickers?|poster|socken|bierdeckel)\b/i
const MERCH_ANY = /\b(t-?shirts?|hoodies?|gutscheine?|vouchers?|gift ?cards?|flat cap|logo|six-?pack|\d+er-?pack|tasting ?box|calculator)\b/i

/**
 * Website layout around a name: list numbers and bullets („#10 Pilsner“, „* Lazy Frog IPA“, „> Pumpkin Ale -->“),
 * emoji, „*NEW*“, guillemets („‹Loncium› Helles“). Only the shown name changes – ids stay on the raw name.
 */
export function tidyBeerName(name: string): string {
  const t = name
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, ' ')
    .replace(/\*+\s*(new|neu)\s*\*+/gi, ' ')
    .replace(/[‹›«»„“”"]/g, ' ')
    .replace(/-+>|<-+/g, ' ')
    // leading bullets and list numbers („#10 Pilsner“) – a plain leading number is part of the name („24 Karat Lager“)
    .replace(/^[\s*>•~·–—'‘‚-]*(?:#\d{1,2}\s+(?=\p{L}))?[\s#*>•~·–—-]*/u, '')
    .replace(/[\s*>•~·–—-]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
  return t || name.trim()
}

/** Merch, hashtags, awards, bare headings („** The Ales **“) and names that are no name („51631“, „@ …“). */
export const notABeerName = (name: string) => {
  const t = tidyBeerName(name)
  return (
    MERCH_START.test(t) ||
    MERCH_ANY.test(t) ||
    /#\p{L}/u.test(name) ||
    /^\s*[\u{1F947}-\u{1F949}]/u.test(name) || // „🥉 Bronze – Hoppy Lager“ is an award line
    // a list heading; a bare „Lager“ is the brewery's lager and stays
    /^(the )?(ales|beers|lagers|biere)$/i.test(t) ||
    // V5: section headings of a beer page („Non-Alcoholic Offerings“, „Unser Sortiment“, „Our Beers“)
    /\b(offerings|sortiment)$|^(unsere|our|all) (biere|beers)\b/i.test(t) ||
    /^[^\p{L}\p{N}]/u.test(t) ||
    // a short number is a name („805“, „1516“), a long one an article or postcode („51631“)
    ((t.match(/\p{L}/gu)?.length ?? 0) < 2 && t.length > 4)
  )
}

/**
 * V1/V4 – how well a beer is backed (regional_beers.quality), checked automatically against every source naming it:
 * 3 geprüft   – all data agree: it exists (2), the style is known, two sources give the same ABV (± 0.3) and no source
 *               contradicts style or ABV (hand-researched curated beers are 3 as well);
 * 2 bestätigt – the beer exists: a product with EAN (Open Food Facts), a Wikidata item, or two independent sources;
 * 0 fraglich  – only the openbeer lists (~2014, may be gone), or neither style nor ABV;
 * 1 gefunden  – everything else: the crawler's raw result (usually one website mention).
 */
export type Quality = 0 | 1 | 2 | 3
export interface Evidence {
  source: number
  style: string | null
  abv: number | null
}
const ABV_TOLERANCE = 0.3
export function beerQuality(evidence: readonly Evidence[], beer: { style: string | null; abv: number | null }): Quality {
  const sources = new Set(evidence.map((e) => e.source))
  if ((sources.size === 1 && sources.has(SOURCE.openbeer)) || (beer.style == null && beer.abv == null)) return 0
  if (!(sources.has(SOURCE.off) || sources.has(SOURCE.wikidata) || sources.size >= 2)) return 1
  if (beer.style == null || beer.abv == null) return 2
  const abvAgrees = (e: Evidence) => e.abv != null && Math.abs(e.abv - beer.abv!) <= ABV_TOLERANCE + 1e-9
  const contradicts = (e: Evidence) => (e.abv != null && !abvAgrees(e)) || (e.style != null && e.style !== beer.style)
  if (evidence.some(contradicts)) return 2
  return new Set(evidence.filter(abvAgrees).map((e) => e.source)).size >= 2 ? 3 : 2
}

/**
 * V10: a product sold only abroad names a brewery that exports – one with a Wikidata item – by its full name, and that
 * name is distinctive: not just its place („Lancaster“), not one short word („Lion“, „Star“).
 */
function exportBrand(p: Pick<OffRow, 'brands'>, b: Brewery): boolean {
  const key = exactKey(p.brands)
  const own = [b.name, ...(b.aliases ?? [])].map((n) => exactKey(n))
  return !!b.qid && own.includes(key) && key !== exactKey(b.city) && (key.includes(' ') || key.length >= 6)
}

/**
 * V10: the name is the brewery and a style („Tucher Helles“, „Krombacher“) – not a beer that only begins with a
 * brewery's word („Modern Times Hazy Galaxy IPA“ is no beer of „Modern Brewery“) or names it somewhere („Bier hell Olching“).
 */
function breweryAndStyle(name: string, b: Brewery): boolean {
  const own = new Set([b.name, ...(b.aliases ?? [])].flatMap(words))
  const rest = cleanBeerName(name).split(/\s+/)
  const isOwn = (w: string) => words(w).length > 0 && words(w).every((t) => own.has(t) || own.has(stem(t)))
  let i = 0
  while (i < rest.length && (isOwn(rest[i]) || (i > 0 && !words(rest[i]).length))) i++
  return i > 0 && (i === rest.length || styleOnly(rest.slice(i).join(' ')))
}

/**
 * Open Food Facts products and Wikidata beers → main beers of the matched breweries (unmatched products
 * are dropped). Both sources compete per style; Open Food Facts usually wins on completeness (pack).
 * V5: an ABV that does not fit the style is dropped before anything else sees it; `notes` collects what was dropped.
 */
export function mainBeers(
  off: OffRow[],
  breweries: Brewery[],
  wdBeers: WikidataBeerRow[] = [],
  openbeer: OpenbeerRow[] = [],
  web: WebRow[] = [],
  notes: PlausibilityNote[] = [],
  research: ResearchRow[] = [],
): RegionalBeer[] {
  const match = breweryMatcher(breweries)
  const bySite = breweryBySite(breweries)
  const perBrewery = new Map<string, Candidate[]>()
  const add = (breweryId: string, c: Candidate) => {
    if (!notABeerName(c.name)) perBrewery.set(breweryId, [...(perBrewery.get(breweryId) ?? []), c])
  }
  const byQid = new Map(breweries.filter((b) => b.qid).map((b) => [b.qid!, b]))
  const seen = new Set<string>()
  for (const p of off) {
    const name = text(p.name, 200)
    if (!name || !/^[0-9]{4,20}$/.test(p.code) || seen.has(p.code)) continue
    seen.add(p.code)
    // V10: no brand field – the brand is in the name („Tucher Helles“); products sold only abroad need the exact name
    // of a brewery that exports – one with a Wikidata item („Adler Beer Company“ in Italy is not our Adler)
    const fromName = !p.brands && !p.owner
    const b = p.abroad ? match(p, false, true) : match(fromName ? { ...p, brands: cleanBeerName(name) } : p)
    if (!b || (p.abroad && !exportBrand(p, b)) || (fromName && !breweryAndStyle(name, b))) continue
    // not sold in the brewery's country: a same-named brewery elsewhere is as likely („Desperados“ is no Texan
    // „Dos Desperados“) – the exact name or nothing
    if (p.countries && !p.countries.includes(b.country) && match(p, false, true)?.id !== b.id) continue
    const abv = p.abv != null && p.abv >= 0 && p.abv <= 20 ? Math.round(p.abv * 10) / 10 : null
    add(b.id, {
      code: p.code,
      name: tidyBeerName(cleanBeerName(name)),
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
      bySite(w.breweryWebsite) ??
      // a full brewery name, like the lists: „Modern Times Beer“ is not „Modern Brewery“
      (w.breweryName ? match({ brands: w.breweryName, owner: null, places: w.breweryPlace ?? null }, false, true) : null)
    if (!name || !b || !/^Q\d+$/.test(qid) || /^Q\d+$/.test(name)) continue
    // brand and company items („Biermarke“, „Brauerei“) are not a single beer
    if (w.kinds.some((k) => NOT_A_BEER.test(k))) continue
    const abv = w.abv != null && w.abv >= 0 && w.abv <= 20 ? Math.round(w.abv * 10) / 10 : null
    add(b.id, {
      code: qid.toLowerCase(),
      name: tidyBeerName(name),
      style: normalizeStyle([name, ...w.kinds], abv),
      abv,
      pack: null,
      source: SOURCE.wikidata,
      sourceRef: qid,
    })
  }
  const seenOpenbeer = new Set<string>()
  for (const o of openbeer) {
    const b = match({ brands: o.brewery, owner: null, places: o.city }, true)
    if (!b) continue
    const code = `o${stableHash(`${normName(o.brewery)}|${normName(o.name)}`)}`
    if (seenOpenbeer.has(code)) continue
    seenOpenbeer.add(code)
    add(b.id, {
      code,
      name: tidyBeerName(o.name),
      style: normalizeStyle([o.name, o.styles.replace(/[_|]/g, ' ')], o.abv),
      abv: o.abv,
      pack: null,
      source: SOURCE.openbeer,
      sourceRef: o.ref,
    })
  }
  // website beers are crawled per brewery – no matching, the brewery only has to still exist
  const known = new Set(breweries.map((b) => b.id))
  const seenWeb = new Set<string>()
  for (const w of web) {
    const name = text(w.name, 200)
    if (!name || !known.has(w.breweryId)) continue
    const code = `w${stableHash(`${w.breweryId}|${normName(name)}`)}`
    if (seenWeb.has(code)) continue
    seenWeb.add(code)
    const abv = w.abv != null && w.abv > 0 && w.abv <= 20 ? Math.round(w.abv * 10) / 10 : null
    add(w.breweryId, {
      code,
      name: tidyBeerName(name),
      style: normalizeStyle([name, w.style ?? ''], abv),
      abv,
      pack: null,
      source: SOURCE.web,
      sourceRef: w.path.slice(0, 300) || '/',
    })
  }
  // V12: researched on another site than the brewery's own – the page is the reference
  const seenResearch = new Set<string>()
  for (const r of research) {
    const name = text(r.name, 200)
    if (!name || !known.has(r.breweryId)) continue
    const code = `x${stableHash(`${r.breweryId}|${normName(name)}`)}`
    if (seenResearch.has(code)) continue
    seenResearch.add(code)
    const abv = r.abv != null && r.abv > 0 && r.abv <= 20 ? Math.round(r.abv * 10) / 10 : null
    add(r.breweryId, {
      code,
      name: tidyBeerName(name),
      style: normalizeStyle([name, r.style ?? ''], abv),
      abv,
      pack: null,
      source: SOURCE.research,
      sourceRef: r.url,
    })
  }
  // a bare „Blonde“ is an abbey beer in German-speaking countries, an American blonde ale in English-speaking ones
  const lang = new Map(breweries.map((b) => [b.id, COUNTRY_INFO[b.country].lang]))
  const localStyle = (breweryId: string, c: Candidate) =>
    c.style === 'Abbey Blonde' && lang.get(breweryId) === 'en' && !/abbey|abbaye|abdij|belgian|belge/i.test(c.name)
      ? 'Blonde Ale'
      : c.style
  const breweryById = new Map(breweries.map((b) => [b.id, b]))
  const out: RegionalBeer[] = []
  for (const [breweryId, raw] of [...perBrewery].sort((a, b) => a[0].localeCompare(b[0]))) {
    const brewery = breweryById.get(breweryId)!
    const names = [brewery.name, ...(brewery.aliases ?? [])]
    const checked = raw.map((c) => {
      const style = localStyle(breweryId, c)
      const checked = checkAbv(style, c.abv)
      if (checked.flag) notes.push({ breweryId, name: c.name, style, abv: c.abv!, flag: checked.flag })
      return { ...c, style, abv: checked.abv, twin: twinKey(c.name, names) || undefined }
    })
    // the same beer named by several sources (sizes, spellings, with or without the brewery name): what backs it –
    // the values each source gives, before gaps are filled from the twins
    const evidence = new Map<string, Evidence[]>()
    for (const c of checked)
      if (c.twin) evidence.set(c.twin, [...(evidence.get(c.twin) ?? []), { source: c.source ?? SOURCE.off, style: c.style, abv: c.abv }])
    const backing = (c: Candidate): Evidence[] =>
      c.twin ? evidence.get(c.twin)! : [{ source: c.source ?? SOURCE.off, style: c.style, abv: c.abv }]
    const exists = (ev: Evidence[]) => {
      const sources = new Set(ev.map((e) => e.source))
      return sources.has(SOURCE.off) || sources.has(SOURCE.wikidata) || sources.size >= 2
    }
    const cands = checked.map((c) => {
      const twins = c.twin ? checked.filter((o) => o.twin === c.twin) : []
      return {
        ...c,
        abv: c.abv ?? twins.find((o) => o.abv != null)?.abv ?? null,
        pack: c.pack ?? twins.find((o) => o.pack)?.pack ?? null,
        backed: exists(backing(c)),
      }
    })
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
        quality: beerQuality(backing(c), c),
      }),
    )
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// openbeer / beer.db text files (Public Domain, github.com/openbeer)
// ---------------------------------------------------------------------------------------------

/** 64-bit FNV-1a as 16 hex chars – stable ids for beers without an EAN or Q-id. */
export function stableHash(s: string): string {
  let h = 0xcbf29ce484222325n
  for (const byte of new TextEncoder().encode(s)) h = ((h ^ BigInt(byte)) * 0x100000001b3n) & 0xffffffffffffffffn
  return h.toString(16).padStart(16, '0')
}

/**
 * Beers of one beer.db file. Formats seen in the repos:
 *   „- Augustiner Bräu | München“ or „- Trumer Privatbrauerei, Obertrum“ (brewery header, then its beers)
 *   „Augustiner Edelstoff, 5.6%, muenchner“ / „Trumer Pils, 4.9%, 11.5°, lager|pils“ / indented names
 *   „6-Korn Bier | Pyraser Landbrauerei | Pyras (Thalmässing), Mittelfranken“ (table: beer | brewery | place)
 *   „Brauerei Reder, Pfeffenhausen //“ (brewery list without beers – skipped)
 */
export function parseOpenbeer(textContent: string, ref: string): OpenbeerRow[] {
  const out: OpenbeerRow[] = []
  let brewery: { name: string; city: string | null } | null = null
  for (const raw of textContent.split('\n')) {
    const line = raw.replace(/(^|\s)#.*$/, '').trimEnd()
    const t = line.trim()
    if (!t || /^[-=_]{2,}/.test(t) || t.includes('//')) continue
    const header = t.match(/^-\s+(.+)$/)
    if (header) {
      const h = header[1].trim()
      const [name, city] = h.includes('|') ? h.split('|') : [h.replace(/,[^,]*$/, ''), h.includes(',') ? h.replace(/^.*,/, '') : null]
      brewery = { name: name.trim(), city: city?.trim() || null }
      continue
    }
    const first = t.split(',')[0]
    let beer: string
    let rest: string[]
    let at = brewery
    if ((first.match(/\|/g) ?? []).length >= 2) {
      const [b, br, place] = t.split('|').map((x) => x.trim())
      beer = b
      rest = []
      at = { name: br, city: place?.split(',')[0].replace(/\s*\(.*\)/, '').trim() || null }
    } else {
      const parts = t.split(',').map((x) => x.trim())
      beer = parts[0].split('|')[0]
      rest = parts.slice(1)
    }
    if (!at) continue
    const tags = [...beer.matchAll(/\{([^}]*)\}/g)].map((m) => m[1])
    const name = beer.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim()
    if (name.length < 2 || name.length > 80 || !/\p{L}/u.test(name) || name.startsWith('by:')) continue
    let abv: number | null = null
    const styles = [...tags]
    for (const r of rest) {
      const pct = r.match(/^<?\s*(\d+(?:\.\d+)?)\s*%$/)
      if (pct) abv = Number(pct[1])
      else if (!/°$/.test(r) && !r.startsWith('by:') && r) styles.push(r)
    }
    out.push({ ref, brewery: at.name, city: at.city, name, abv: abv != null && abv <= 20 ? abv : null, styles: styles.join('|') })
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// GeoNames postcodes (TSV: country, postcode, place, admin…, lat, lon, accuracy)
// ---------------------------------------------------------------------------------------------

/** places.postcode per country – GeoNames has Canada as FSAs (the first three characters) only. */
const POSTCODE: Record<Country, RegExp> = { DE: /^[0-9]{5}$/, AT: /^[0-9]{4}$/, CH: /^[0-9]{4}$/, CA: /^[A-Z][0-9][A-Z]$/, US: /^[0-9]{5}$/ }

export function parsePlaces(tsv: string, country: Country): Place[] {
  const out = new Map<string, Place>()
  for (const line of tsv.split('\n')) {
    const f = line.split('\t')
    if (f.length < 11 || f[0] !== country) continue
    const postcode = f[1].trim()
    const name = text(f[2], 120)
    const lat = Number(f[9])
    const lon = Number(f[10])
    if (!POSTCODE[country].test(postcode) || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
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

/** A country may lose at most this share of its published breweries in one import. */
export const MAX_DROP = 0.1

/**
 * Import SQL as ordered files (each one transaction, small enough for `supabase db query`). The guard counts what was
 * downloaded (`downloaded`), before breweries are hidden on purpose (V12: research, unconfirmed ones).
 */
export function importSql(
  breweries: Brewery[],
  beers: RegionalBeer[],
  places: Place[],
  batch = 500,
  downloaded: Brewery[] = breweries,
): ImportFile[] {
  const files: ImportFile[] = []
  const pad = (i: number) => String(i + 1).padStart(3, '0')
  const tx = (sql: string) => `begin;\n${sql}commit;\n`
  // first file: stop before anything is written when a country lost more than MAX_DROP of what is live – a
  // download can come back short without failing (2026-10: Overpass left out Saxony and Hesse)
  const counts = COUNTRIES.map((c) => `(${lit(c)}, ${downloaded.filter((b) => b.country === c).length})`).join(', ')
  files.push({
    name: '05-guard.sql',
    sql:
      `do $$\ndeclare r record;\nbegin\n` +
      `  for r in select n.country, n.count, coalesce(l.count, 0) as live from (values ${counts}) as n (country, count)\n` +
      `    left join (select country, count(*) as count from public.breweries where published and id not like 'app-%' group by country) l using (country)\n` +
      `  loop\n` +
      `    if r.count < r.live * ${1 - MAX_DROP} then\n` +
      `      raise exception 'breweries %: % in the import, % published – incomplete download?', r.country, r.count, r.live;\n` +
      `    end if;\n  end loop;\nend $$;\n`,
  })
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
          ['id', 'brewery_id', 'name', 'style', 'abv', 'pack', 'rank', 'source', 'source_ref', 'quality', 'published'],
          ['id'],
          rows.map((b) => [
            lit(b.id), lit(b.breweryId), lit(b.name), lit(b.style), lit(b.abv),
            b.pack ? `${lit(JSON.stringify(b.pack))}::jsonb` : 'null', lit(b.rank), lit(b.source), lit(b.sourceRef), lit(b.quality), 'true',
          ]),
        ),
      ),
    }),
  )
  files.push({
    name: '30-unpublish.sql',
    sql: tx(
      // beers and breweries reported in the app (R6: source 5, `app-<issue>`) are not the sources' to take back
      `update public.regional_beers set published = false where published and source <> 5 and id <> all(${arr(beers.map((b) => b.id))});\n` +
        `update public.breweries set published = false where published and id not like 'app-%' and id <> all(${arr(breweries.map((b) => b.id))});\n`,
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
