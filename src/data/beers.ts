import raw from './beers.json'
import type { Beer } from '../domain/types'
import { mergeCatalog, readCachedRows } from './catalog'

/**
 * All beers in dataset order: beers.json plus the rows last fetched from the database (B3, see
 * catalog.ts). Extend by editing beers.json or adding a row to `beers` – no code change needed.
 */
export const BEERS: readonly Beer[] = mergeCatalog(raw as Beer[], readCachedRows())

export const BEER_BY_ID: Readonly<Record<string, Beer>> = Object.fromEntries(
  BEERS.map((b) => [b.id, b]),
)

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
