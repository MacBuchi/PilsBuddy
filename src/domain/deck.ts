import { DECK_ORDER } from '../data/beers'
import type { Ratings } from './types'

/** Beers still to be dated, in deck order. */
export function deckQueue(ratings: Ratings): string[] {
  return DECK_ORDER.filter((id) => !ratings[id])
}

/** "07/42" style position label for a card. */
export function deckPosition(id: string): string {
  const n = DECK_ORDER.indexOf(id) + 1
  return `${String(n).padStart(2, '0')}/${DECK_ORDER.length}`
}
