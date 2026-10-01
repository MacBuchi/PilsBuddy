import raw from './beers.json'
import type { Beer } from '../domain/types'
import { toRegionalBeer } from '../domain/regionalBeer'
import type { RegionalBeerRow, RegionalBrewery } from '../domain/regionalBeer'
import { mergeCatalog, readCachedRows } from './catalog'
import { readSnapshots, writeSnapshot } from './regional'

/**
 * All beers in dataset order: beers.json plus the rows last fetched from the database (B3, see
 * catalog.ts). Extend by editing beers.json or adding a row to `beers` – no code change needed.
 */
export const BEERS: readonly Beer[] = mergeCatalog(raw as Beer[], readCachedRows())

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
  return abv.toFixed(1).replace('.', ',') + ' %'
}
