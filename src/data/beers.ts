import raw from './beers.json'
import en from './beers.en.json'
import type { Beer } from '../domain/types'
import { LANG } from '../state/lang'
import { COPY } from './copy'
import { toRegionalBeer } from '../domain/regionalBeer'
import type { RegionalBeerRow, RegionalBrewery } from '../domain/regionalBeer'
import { mergeCatalog, readCachedRows } from './catalog'
import { readSnapshots, writeSnapshot } from './regional'

/**
 * All beers in dataset order: beers.json plus the rows last fetched from the database (B3, see
 * catalog.ts). Extend by editing beers.json or adding a row to `beers` – no code change needed.
 */
export const BEERS: readonly Beer[] = localize(mergeCatalog(raw as Beer[], readCachedRows()))

/** English texts for the curated beers (I1), keyed by id; place names translated where English has its own. */
export interface BeerTranslations {
  countries: Record<string, string>
  regions: Record<string, string>
  beers: Record<string, Partial<Pick<Beer, 'description' | 'humorousBio' | 'disLikeQuip' | 'tags'>>>
}

/** A beer in the other language: translated texts where there are some, German stays where there are none. */
export function translateBeer(b: Beer, t: BeerTranslations): Beer {
  return {
    ...b,
    ...t.beers[b.id],
    country: t.countries[b.country] ?? b.country,
    region: t.regions[b.region] ?? b.region,
  }
}

function localize(beers: Beer[]): Beer[] {
  return LANG === 'en' ? beers.map((b) => translateBeer(b, en)) : beers
}

/**
 * Every beer the app can name: the catalogue plus regional beers the user touched (Stufe R4, snapshots
 * on the device). Regional beers never join BEERS – the swipe deck stays curated.
 */
const byId: Record<string, Beer> = Object.fromEntries([
  ...readSnapshots().map((s) => [s.row.id, toRegionalBeer(s.row, s.brewery)] as const),
  ...BEERS.map((b) => [b.id, b] as const),
])

export const BEER_BY_ID: Readonly<Record<string, Beer>> = byId

/**
 * Makes a regional beer known from now on (Detail, Probierliste, DNA) and keeps its snapshot for the
 * next start. Call it before opening or rating the beer.
 */
export function rememberRegional(row: RegionalBeerRow, brewery: RegionalBrewery | Omit<RegionalBrewery, 'beers'>): Beer {
  const beer = byId[row.id]?.regional || !byId[row.id] ? toRegionalBeer(row, brewery) : byId[row.id]
  byId[row.id] = beer
  writeSnapshot(row, brewery)
  return beer
}

/**
 * Makes a regional beer of the Regional-Modus pool known for this session (deck card, Detail) without
 * keeping a snapshot – that happens only once the user rates or opens it (`rememberRegional`).
 */
export function knowRegional(row: RegionalBeerRow, brewery: RegionalBrewery | Omit<RegionalBrewery, 'beers'>): Beer {
  if (!byId[row.id]) byId[row.id] = toRegionalBeer(row, brewery)
  return byId[row.id]
}

/** Deck order: reference beers first (they cover diverse profiles), then the rest. */
export const DECK_ORDER: readonly string[] = [
  ...BEERS.filter((b) => b.reference).map((b) => b.id),
  ...BEERS.filter((b) => !b.reference).map((b) => b.id),
]

export const REFERENCE_COUNT = BEERS.filter((b) => b.reference).length

export function getBeer(id: string): Beer {
  const b = BEER_BY_ID[id]
  if (!b) throw new Error(`Unknown beer id: ${id}`)
  return b
}

export function formatAbv(abv: number): string {
  return abv.toFixed(1).replace('.', COPY.app.decimal) + ' %'
}
