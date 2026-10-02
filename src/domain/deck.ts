import { BEER_BY_ID, DECK_ORDER } from '../data/beers'
import { computeTasteVector } from './dna'
import { compatibility } from './matching'
import type { Beer, Ratings } from './types'

/**
 * Why a card is in the deck at this position:
 * reference – onboarding set, fixed order, covers all style families;
 * forYou    – the closest unrated match to the current DNA;
 * horizon   – every third curated card: the furthest one, so the DNA keeps learning;
 * regional  – Regional-Modus (R5, switched on in the finder): every third card is a beer from the user's
 *             surroundings (last finder result), the best match first; the other cards keep their order.
 */
export type DeckPick = 'reference' | 'forYou' | 'horizon' | 'regional'

export interface DeckCard {
  id: string
  pick: DeckPick
  /** Compatibility with the DNA at the time the deck was built (curated and regional cards). */
  pct?: number
  /** Distance to the brewery (regional cards only). */
  km?: number
}

/** A beer from the last finder result, for the Regional-Modus. */
export interface NearbyBeer {
  beer: Beer
  km: number
}

/** After the reference set: two "für dich", then one "mal was anderes". */
export const HORIZON_EVERY = 3
/** Regional-Modus: every third card comes from the surroundings. */
export const REGIONAL_EVERY = 3

/** Regional beer ids (`r-<EAN>`, `r-q123`, `r-app12`) – curated ids never start like that. */
export const isRegionalId = (id: string) => id.startsWith('r-')

/** Beers still to be dated, in the order the user will see them. Deterministic for given ratings. */
export function buildDeck(
  ratings: Ratings,
  order: readonly string[] = DECK_ORDER,
  lookup: Readonly<Record<string, Beer>> = BEER_BY_ID,
  nearby: readonly NearbyBeer[] = [],
): DeckCard[] {
  const reference = order.filter((id) => lookup[id].reference && !ratings[id]).map((id): DeckCard => ({ id, pick: 'reference' }))
  const taste = computeTasteVector(ratings, lookup)
  const rest = order
    .filter((id) => !lookup[id].reference && !ratings[id])
    .map((id, index) => ({ id, index, pct: compatibility(taste, lookup[id].taste) }))
  // best first; ties by dataset order
  rest.sort((a, b) => b.pct - a.pct || a.index - b.index)

  let slot = order.filter((id) => !lookup[id].reference && ratings[id]).length
  const curated: DeckCard[] = []
  let lo = 0
  let hi = rest.length - 1
  while (lo <= hi) {
    const horizon = slot % HORIZON_EVERY === HORIZON_EVERY - 1
    const c = horizon ? rest[hi--] : rest[lo++]
    curated.push({ id: c.id, pick: horizon ? 'horizon' : 'forYou', pct: c.pct })
    slot++
  }
  if (!nearby.length) return [...reference, ...curated]

  // Regional-Modus: unrated nearby beers, best match first (then nearest, then id) …
  const seen = new Set<string>()
  const pool = nearby
    .filter((n) => !ratings[n.beer.id] && !seen.has(n.beer.id) && seen.add(n.beer.id))
    .map((n): DeckCard => ({ id: n.beer.id, pick: 'regional', pct: compatibility(taste, n.beer.taste), km: n.km }))
    .sort((a, b) => b.pct! - a.pct! || a.km! - b.km! || a.id.localeCompare(b.id))
  // … woven into the whole deck (the user switched the mode on after onboarding); the position counts every
  // card dated so far, so the pattern keeps its rhythm while the deck is rebuilt after each swipe
  const own = [...reference, ...curated]
  let pos = order.filter((id) => ratings[id]).length + Object.keys(ratings).filter(isRegionalId).length
  const woven: DeckCard[] = []
  let c = 0
  let r = 0
  while (c < own.length || r < pool.length) {
    const regionalTurn = r < pool.length && (pos % REGIONAL_EVERY === REGIONAL_EVERY - 1 || c >= own.length)
    woven.push(regionalTurn ? pool[r++] : own[c++])
    pos++
  }
  return woven
}

/** Beer ids still to be dated, in deck order. */
export function deckQueue(ratings: Ratings): string[] {
  return buildDeck(ratings).map((c) => c.id)
}
