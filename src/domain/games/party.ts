import type { Beer } from '../types'
import { GLASS_BY_ID, newFillGame, scoreGuess } from './fill'
import type { FillRound } from './fill'
import { newQuartett, playStat, QUARTETT_STATS } from './quartett'
import type { Player, QuartettRound, QuartettState, StatKey } from './quartett'
import { parseTasting } from './tasting'
import type { Tasting } from './tasting'

/**
 * The games of a room (Stufe E5): Bier-Quartett for two and „Wie viel ist drin?“ for everyone at
 * the table; the Tasting-Abend (Stufe E6) has its own file, tasting.ts. Only the host runs these rules (see room.ts); guests send wishes and render what the
 * host sends back. Pure and deterministic – the host's UI passes in the seed.
 */

/** Quartett zu zweit: seat 0 is the host and starts, seat 1 the one guest. */
export interface Duel {
  kind: 'quartett'
  /** Player ids, index = Quartett player. */
  seats: [string, string]
  q: QuartettState
}

/** „Wie viel ist drin?“ for everyone: same glasses for all, everyone guesses, then the host reveals. */
export interface FillParty {
  kind: 'fill'
  rounds: FillRound[]
  /** The glass on the table. */
  index: number
  /** The current glass is resolved – everyone sees the truth and all guesses. */
  revealed: boolean
  /** Guesses for the current glass, by player id. */
  guesses: Record<string, number>
  /** Points of the glasses already resolved, by player id. */
  points: Record<string, number>
  /** All glasses resolved and the host asked for the result. */
  over: boolean
}

export type PartyGame = Duel | FillParty | Tasting
export type PartyKind = PartyGame['kind']

export function newDuel(seats: [string, string], deck: readonly string[], seed: number): Duel {
  return { kind: 'quartett', seats, q: newQuartett(deck, seed) }
}

/** The player whose turn it is names a stat; anyone else, or a finished game, changes nothing. */
export function duelPlay(d: Duel, from: string, stat: StatKey, lookup: Readonly<Record<string, Beer>>): Duel {
  if (d.q.winner !== null || d.seats[d.q.turn] !== from) return d
  const [a, b] = [d.q.piles[0][0], d.q.piles[1][0]]
  if (!lookup[a] || !lookup[b]) return d
  return { ...d, q: playStat(d.q, stat, lookup) }
}

/** The seat of `id`, or null for someone watching. */
export function seatOf(d: Duel, id: string): Player | null {
  const i = d.seats.indexOf(id)
  return i === 0 || i === 1 ? i : null
}

/** A round as seen from `seat`: own card and value first, outcome 0 = „I won“ – like against the bot. */
export function roundFor(r: QuartettRound, seat: Player): QuartettRound {
  if (seat === 0) return r
  const flip = (p: Player): Player => (p === 0 ? 1 : 0)
  return {
    ...r,
    chooser: flip(r.chooser),
    cards: [r.cards[1], r.cards[0]],
    values: [r.values[1], r.values[0]],
    outcome: r.outcome === 'tie' ? 'tie' : flip(r.outcome),
  }
}

export function newFillParty(seed: number): FillParty {
  return { kind: 'fill', rounds: newFillGame(seed).rounds, index: 0, revealed: false, guesses: {}, points: {}, over: false }
}

/** A guess for the current glass – once per player and glass, only before the reveal. */
export function fillGuess(f: FillParty, from: string, ml: number): FillParty {
  if (f.over || f.revealed || Object.hasOwn(f.guesses, from) || !Number.isFinite(ml)) return f
  const cap = GLASS_BY_ID[f.rounds[f.index].glass].nominal * 2
  return { ...f, guesses: { ...f.guesses, [from]: Math.min(cap, Math.max(0, Math.round(ml))) } }
}

/** Resolves the current glass: everyone who guessed gets their points. Needs at least one guess. */
export function fillReveal(f: FillParty): FillParty {
  if (f.over || f.revealed || !Object.keys(f.guesses).length) return f
  const round = f.rounds[f.index]
  const points = { ...f.points }
  for (const [id, g] of Object.entries(f.guesses)) points[id] = (points[id] ?? 0) + scoreGuess(round, g)
  return { ...f, revealed: true, points }
}

/** Reveals by itself once everyone at the table (`ids`) has guessed. */
export function fillSettle(f: FillParty, ids: readonly string[]): FillParty {
  return ids.length && ids.every((id) => Object.hasOwn(f.guesses, id)) ? fillReveal(f) : f
}

/** After a reveal: the next glass, or the result after the last one. */
export function fillNext(f: FillParty): FillParty {
  if (f.over || !f.revealed) return f
  if (f.index + 1 >= f.rounds.length) return { ...f, over: true }
  return { ...f, index: f.index + 1, revealed: false, guesses: {} }
}

/** Points of `round` for one guess (for the reveal list). */
export const fillPoints = (f: FillParty, id: string): number | null =>
  Object.hasOwn(f.guesses, id) ? scoreGuess(f.rounds[f.index], f.guesses[id]) : null

/** Everyone at the table, best first; equal points share a place (1, 1, 3). */
export function fillRanking(f: FillParty, ids: readonly string[]): { id: string; points: number; place: number }[] {
  const list = ids.map((id) => ({ id, points: f.points[id] ?? 0 })).sort((a, b) => b.points - a.points)
  return list.map((e) => ({ ...e, place: list.findIndex((o) => o.points === e.points) + 1 }))
}

// ---- snapshots from the network -------------------------------------------------------------

const STAT_KEYS = new Set<string>(QUARTETT_STATS.map((s) => s.key))
const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0
const isIds = (a: unknown): a is string[] => Array.isArray(a) && a.every((x) => typeof x === 'string' && !!x)
const isPlayer = (p: unknown): p is Player => p === 0 || p === 1

export function parseStat(raw: unknown): StatKey | null {
  return typeof raw === 'string' && STAT_KEYS.has(raw) ? (raw as StatKey) : null
}

/** A game from another device, checked field by field; null if anything is off. */
export function parseGame(raw: unknown): PartyGame | null {
  const g = raw as { kind?: unknown } | null
  if (!g || typeof g !== 'object') return null
  if (g.kind === 'quartett') return parseDuel(raw as Record<string, unknown>)
  if (g.kind === 'fill') return parseFill(raw as Record<string, unknown>)
  if (g.kind === 'tasting') return parseTasting(raw as Record<string, unknown>)
  return null
}

function parseDuel(d: Record<string, unknown>): Duel | null {
  const seats = d.seats
  const q = d.q as Record<string, unknown> | null
  if (!isIds(seats) || seats.length !== 2 || seats[0] === seats[1] || !q || typeof q !== 'object') return null
  const piles = q.piles
  if (!Array.isArray(piles) || piles.length !== 2 || !isIds(piles[0]) || !isIds(piles[1]) || !isIds(q.pot)) return null
  if (!isPlayer(q.turn) || !isCount(q.round) || !isCount(q.maxRounds)) return null
  const winner = q.winner
  if (winner !== null && winner !== 'draw' && !isPlayer(winner)) return null
  const last = q.last === null ? null : parseRound(q.last)
  if (last === undefined) return null
  const state: QuartettState = {
    piles: [piles[0], piles[1]],
    pot: q.pot,
    turn: q.turn,
    round: q.round,
    maxRounds: q.maxRounds,
    last,
    winner,
  }
  return { kind: 'quartett', seats: [seats[0], seats[1]], q: state }
}

function parseRound(raw: unknown): QuartettRound | undefined {
  const r = raw as Record<string, unknown> | null
  if (!r || typeof r !== 'object') return undefined
  const stat = parseStat(r.stat)
  const { cards, values, outcome, chooser, won } = r
  if (!stat || !isPlayer(chooser) || !isCount(won) || (outcome !== 'tie' && !isPlayer(outcome))) return undefined
  if (!isIds(cards) || cards.length !== 2) return undefined
  if (!Array.isArray(values) || values.length !== 2 || !values.every((v) => typeof v === 'number' && Number.isFinite(v))) return undefined
  return { stat, chooser, cards: [cards[0], cards[1]], values: [values[0], values[1]], outcome, won }
}

function parseFill(f: Record<string, unknown>): FillParty | null {
  const { rounds, index, revealed, over, guesses, points } = f
  if (!Array.isArray(rounds) || !rounds.length || rounds.length > 20) return null
  const list: FillRound[] = []
  for (const r of rounds as Partial<FillRound>[]) {
    if (!r || typeof r.glass !== 'string' || !Object.hasOwn(GLASS_BY_ID, r.glass) || !isCount(r.ml)) return null
    list.push({ glass: r.glass, ml: r.ml })
  }
  if (!isCount(index) || index >= list.length || typeof revealed !== 'boolean' || typeof over !== 'boolean') return null
  const g = parseNumbers(guesses)
  const p = parseNumbers(points)
  if (!g || !p) return null
  return { kind: 'fill', rounds: list, index, revealed, guesses: g, points: p, over }
}

function parseNumbers(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!isCount(v)) return null
    out[k] = v
  }
  return out
}
