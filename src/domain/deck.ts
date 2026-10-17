import { BEER_BY_ID, DECK_ORDER } from '../data/beers'
import { computeTasteVector } from './dna'
import { compatibility } from './matching'
import { swipeable } from './quality'
import type { Beer, Ratings } from './types'

/**
 * Why a card is in the deck at this position:
 * reference – onboarding set, fixed order, covers all style families;
 * forYou    – the closest unrated match to the current DNA;
 * horizon   – every third curated card: the furthest one, so the DNA keeps learning;
 * regional  – Regional-Modus (R5; on by default since 2026-10-17): two of every three cards are beers from the
 *             user's surroundings (radius around the postcode or position), the best match first; the third is a
 *             curated beer. V1: only after the reference set (the first sequencing uses researched beers only) and
 *             never a „fraglich“ beer (quality 0).
 * Curated beers after the reference set come from the user's home region only (wish 2026-10-17: no Canadian beer
 * you cannot buy here); the reference set stays as it is – it calibrates the taste.
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
/** Regional-Modus: one card in three is curated, the other two come from the surroundings. */
export const CURATED_EVERY = 3

/** Where the user lives, as far as the deck cares: the curated beers of these countries (beers.json `country`). */
export type HomeRegion = 'dach' | 'na'
export const HOME_COUNTRIES: Record<HomeRegion, readonly string[]> = {
  dach: ['Deutschland', 'Österreich', 'Schweiz'],
  na: ['USA', 'Kanada'],
}

/** A catalogue country code (place, brewery, browser) → its home region. */
export const homeRegionOf = (country: string | null | undefined): HomeRegion | null =>
  country === 'DE' || country === 'AT' || country === 'CH' ? 'dach' : country === 'US' || country === 'CA' ? 'na' : null

/** Regional beer ids (`r-<EAN>`, `r-q123`, `r-app12`) – curated ids never start like that. */
export const isRegionalId = (id: string) => id.startsWith('r-')

/**
 * Beers still to be dated, in the order the user will see them. Deterministic for given ratings. With a `home`
 * region the curated cards after the reference set come from there only.
 */
export function buildDeck(
  ratings: Ratings,
  order: readonly string[] = DECK_ORDER,
  lookup: Readonly<Record<string, Beer>> = BEER_BY_ID,
  nearby: readonly NearbyBeer[] = [],
  home: HomeRegion | null = null,
): DeckCard[] {
  const reference = order.filter((id) => lookup[id].reference && !ratings[id]).map((id): DeckCard => ({ id, pick: 'reference' }))
  const taste = computeTasteVector(ratings, lookup)
  const atHome = (id: string) => !home || HOME_COUNTRIES[home].includes(lookup[id].country)
  const rest = order
    .filter((id) => !lookup[id].reference && !ratings[id] && atHome(id))
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
    .filter((n) => swipeable(n.beer) && !ratings[n.beer.id] && !seen.has(n.beer.id) && seen.add(n.beer.id))
    .map((n): DeckCard => ({ id: n.beer.id, pick: 'regional', pct: compatibility(taste, n.beer.taste), km: n.km }))
    .sort((a, b) => b.pct! - a.pct! || a.km! - b.km! || a.id.localeCompare(b.id))
  // … woven in after the reference set, two regional cards to one curated; the position counts every card dated so
  // far, so the pattern keeps its rhythm while the deck is rebuilt after each swipe
  const own = curated
  let pos = order.filter((id) => ratings[id]).length + Object.keys(ratings).filter(isRegionalId).length + reference.length
  const woven: DeckCard[] = [...reference]
  let c = 0
  let r = 0
  while (c < own.length || r < pool.length) {
    const regionalTurn = r < pool.length && (pos % CURATED_EVERY !== CURATED_EVERY - 1 || c >= own.length)
    woven.push(regionalTurn ? pool[r++] : own[c++])
    pos++
  }
  return woven
}

/** Beer ids still to be dated, in deck order. */
export function deckQueue(ratings: Ratings): string[] {
  return buildDeck(ratings).map((c) => c.id)
}
