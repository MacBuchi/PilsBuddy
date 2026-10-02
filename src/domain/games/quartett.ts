import { COPY } from '../../data/copy'
import type { Beer, TasteAxis } from '../types'

/**
 * Bier-Quartett (Stufe E1), played like Supertrumpf: both players hold a pile, the player whose
 * turn it is names a value of their top card, the higher value takes both cards (and the pot).
 * Pure and deterministic – shuffling uses a seeded PRNG, so the same seed deals the same game.
 * The state is plain data so a later multiplayer host can send it as is.
 */

export type StatKey = 'abv' | TasteAxis

export interface QuartettStat {
  key: StatKey
  label: string
}

/** The rows on every card; for all of them the higher value wins. */
export const QUARTETT_STATS: readonly QuartettStat[] = [
  { key: 'abv', label: COPY.quartett.stats.abv },
  { key: 'bitterness', label: COPY.quartett.stats.bitterness },
  { key: 'hopIntensity', label: COPY.quartett.stats.hopIntensity },
  { key: 'maltiness', label: COPY.quartett.stats.maltiness },
  { key: 'sweetness', label: COPY.quartett.stats.sweetness },
  { key: 'body', label: COPY.quartett.stats.body },
  { key: 'dryness', label: COPY.quartett.stats.dryness },
  { key: 'drinkability', label: COPY.quartett.stats.drinkability },
  { key: 'character', label: COPY.quartett.stats.character },
]

export type Player = 0 | 1

export interface QuartettRound {
  stat: StatKey
  chooser: Player
  /** Top cards: [player 0, player 1]. */
  cards: [string, string]
  values: [number, number]
  /** Who took the cards; 'tie' → both went into the pot. */
  outcome: Player | 'tie'
  /** Cards won this round (incl. the pot); 0 on a tie. */
  won: number
}

export interface QuartettState {
  /** Card ids, top card first. */
  piles: [string[], string[]]
  /** Cards from ties, waiting for the next winner. */
  pot: string[]
  turn: Player
  round: number
  maxRounds: number
  last: QuartettRound | null
  /** null while running; 'draw' only after maxRounds with equal piles. */
  winner: Player | 'draw' | null
}

export function statValue(beer: Beer, key: StatKey): number {
  return key === 'abv' ? beer.abv : beer.taste[key]
}

/** mulberry32 – tiny, good enough for card shuffling, reproducible from a seed. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const rnd = seededRandom(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Deals `perPlayer` cards each from the shuffled ids; player 0 starts. */
export function newQuartett(ids: readonly string[], seed: number, perPlayer = 10, maxRounds = 30): QuartettState {
  const deck = shuffle(ids, seed).slice(0, perPlayer * 2)
  return {
    piles: [deck.filter((_, i) => i % 2 === 0), deck.filter((_, i) => i % 2 === 1)],
    pot: [],
    turn: 0,
    round: 0,
    maxRounds,
    last: null,
    winner: null,
  }
}

/** The current player names `stat`; returns the next state with `last` describing the round. */
export function playStat(state: QuartettState, stat: StatKey, lookup: Readonly<Record<string, Beer>>): QuartettState {
  if (state.winner !== null) return state
  const [mine, theirs] = state.piles
  const cards: [string, string] = [mine[0], theirs[0]]
  const values: [number, number] = [statValue(lookup[cards[0]], stat), statValue(lookup[cards[1]], stat)]
  const outcome: Player | 'tie' = values[0] === values[1] ? 'tie' : values[0] > values[1] ? 0 : 1
  const rest: [string[], string[]] = [mine.slice(1), theirs.slice(1)]

  let piles = rest
  let pot = state.pot
  let won = 0
  if (outcome === 'tie') {
    pot = [...pot, ...cards]
  } else {
    // the winner's own card goes under first, then the loser's, then the pot – like at the table
    const loot = [cards[outcome], cards[outcome === 0 ? 1 : 0], ...pot]
    won = loot.length
    piles = outcome === 0 ? [[...rest[0], ...loot], rest[1]] : [rest[0], [...rest[1], ...loot]]
    pot = []
  }

  const round = state.round + 1
  const turn: Player = outcome === 'tie' ? state.turn : outcome
  return {
    ...state,
    piles,
    pot,
    turn,
    round,
    last: { stat, chooser: state.turn, cards, values, outcome, won },
    winner: decide(piles, round, state.maxRounds),
  }
}

function decide(piles: [string[], string[]], round: number, maxRounds: number): QuartettState['winner'] {
  const [a, b] = [piles[0].length, piles[1].length]
  if (a === 0 && b === 0) return 'draw'
  if (a === 0) return 1
  if (b === 0) return 0
  if (round < maxRounds) return null
  return a === b ? 'draw' : a > b ? 0 : 1
}

/**
 * The bot names the value its top card is strongest at – measured as the share of cards in
 * the game it beats on that stat, so 4.9 % alcohol and 95 bitterness become comparable.
 * Ties between stats go to the earlier row. Deterministic.
 */
export function botChoice(state: QuartettState, lookup: Readonly<Record<string, Beer>>, player: Player = 1): StatKey {
  const all = [...state.piles[0], ...state.piles[1], ...state.pot].map((id) => lookup[id])
  const top = lookup[state.piles[player][0]]
  let best: StatKey = QUARTETT_STATS[0].key
  let bestScore = -1
  for (const { key } of QUARTETT_STATS) {
    const v = statValue(top, key)
    const beaten = all.filter((b) => statValue(b, key) < v).length
    const score = beaten / Math.max(1, all.length - 1)
    if (score > bestScore) {
      best = key
      bestScore = score
    }
  }
  return best
}
