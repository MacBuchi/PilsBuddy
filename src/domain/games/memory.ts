import { shuffle } from './quartett'

/**
 * Flaschen-Memory (Stufe E3): cards lie face down, two are turned per move, a pair stays open.
 * Variant `bottles` pairs a bottle with the same bottle; variant `style` pairs a bottle with the
 * name of its beer style. Pure and deterministic – the same seed lays out the same table, and the
 * state is plain data so a later multiplayer host can send it as is.
 */

export type MemoryVariant = 'bottles' | 'style'

export interface MemoryCard {
  /** Beer id; the two cards of a pair share it. */
  pair: string
  /** What the face shows. In `bottles` both cards are bottles. */
  face: 'bottle' | 'style'
}

export interface MemoryGame {
  variant: MemoryVariant
  cards: MemoryCard[]
  /** Beer ids of the pairs found, in order. */
  found: string[]
  /** Indices of the face-up cards that are not yet a found pair (0–2). */
  open: number[]
  /** Turned pairs of cards so far. */
  moves: number
}

export const MEMORY_PAIRS = 8

/** A game counts as won when it took at most this many moves per pair. */
export const PAR_PER_PAIR = 2

interface Pick {
  id: string
  style: string
}

/**
 * Lays out `pairs` pairs from the shuffled beers. In `style` every style appears once, so the
 * answer is never ambiguous. Throws if there are not enough (distinct) beers.
 */
export function newMemory(beers: readonly Pick[], variant: MemoryVariant, seed: number, pairs = MEMORY_PAIRS): MemoryGame {
  const chosen: Pick[] = []
  const styles = new Set<string>()
  for (const b of shuffle(beers, seed)) {
    if (chosen.length >= pairs) break
    if (variant === 'style' && styles.has(b.style)) continue
    styles.add(b.style)
    chosen.push(b)
  }
  if (chosen.length < pairs) throw new Error(`memory: need ${pairs} beers, got ${chosen.length}`)
  const cards = chosen.flatMap((b): MemoryCard[] => [
    { pair: b.id, face: 'bottle' },
    { pair: b.id, face: variant === 'style' ? 'style' : 'bottle' },
  ])
  return { variant, cards: shuffle(cards, seed ^ 0x2545f491), found: [], open: [], moves: 0 }
}

export const isFound = (game: MemoryGame, index: number): boolean => game.found.includes(game.cards[index].pair)

/** True while two non-matching cards are face up and wait for `settle`. */
export const isPending = (game: MemoryGame): boolean => game.open.length === 2

/**
 * Turns card `index`. The second card of a move counts the move; a pair stays open (found),
 * two different cards stay up until `settle`. Turning a found, open or out-of-range card – or any
 * card while two are pending – changes nothing.
 */
export function flip(game: MemoryGame, index: number): MemoryGame {
  if (index < 0 || index >= game.cards.length || isOver(game) || isPending(game)) return game
  if (game.open.includes(index) || isFound(game, index)) return game
  if (game.open.length === 0) return { ...game, open: [index] }
  const first = game.open[0]
  const moves = game.moves + 1
  if (game.cards[first].pair === game.cards[index].pair)
    return { ...game, open: [], found: [...game.found, game.cards[index].pair], moves }
  return { ...game, open: [first, index], moves }
}

/** Turns two pending cards face down again. */
export const settle = (game: MemoryGame): MemoryGame => (isPending(game) ? { ...game, open: [] } : game)

export const pairCount = (game: MemoryGame): number => game.cards.length / 2

export const isOver = (game: MemoryGame): boolean => game.found.length === pairCount(game)

export const parOf = (game: MemoryGame): number => PAR_PER_PAIR * pairCount(game)

export const isWin = (game: MemoryGame): boolean => isOver(game) && game.moves <= parOf(game)
