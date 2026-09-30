import { BEER_BY_ID, DECK_ORDER } from '../data/beers'
import { computeTasteVector } from './dna'
import { compatibility } from './matching'
import type { Beer, Ratings } from './types'

/**
 * Why a card is in the deck at this position:
 * reference – onboarding set, fixed order, covers all style families;
 * forYou    – the closest unrated match to the current DNA;
 * horizon   – every third curated card: the furthest one, so the DNA keeps learning.
 */
export type DeckPick = 'reference' | 'forYou' | 'horizon'

export interface DeckCard {
  id: string
  pick: DeckPick
  /** Compatibility with the DNA at the time the deck was built (curated cards only). */
  pct?: number
}

/** After the reference set: two "für dich", then one "mal was anderes". */
export const HORIZON_EVERY = 3

/** Beers still to be dated, in the order the user will see them. Deterministic for given ratings. */
export function buildDeck(ratings: Ratings, order: readonly string[] = DECK_ORDER, lookup: Record<string, Beer> = BEER_BY_ID): DeckCard[] {
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
  return [...reference, ...curated]
}

/** Beer ids still to be dated, in deck order. */
export function deckQueue(ratings: Ratings): string[] {
  return buildDeck(ratings).map((c) => c.id)
}
