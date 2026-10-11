import type { Beer } from '../types'
import { duelPlay, fillGuess, fillNext, fillReveal, fillSettle, newDuel, newFillParty, parseGame, parseStat } from './party'
import type { PartyGame, PartyKind } from './party'
import { seededRandom } from './quartett'
import type { StatKey } from './quartett'
import { newTasting, tastingEnd, tastingPour, tastingRate, tastingReveal, tastingSettle, TASTING_AXES } from './tasting'
import type { TastingBeer, TastingVerdict } from './tasting'

/**
 * Multiplayer room (Stufe E4): the rules of a room, without the network. One device opens the
 * room and is the host – it alone changes the state; the others send wishes (intents) and get the
 * host's state back as a numbered snapshot. Who is there comes from Realtime presence.
 * Pure and deterministic – the code comes from a seed the UI passes in.
 */

/** No 0/O, 1/I/L – read aloud across a pub table without mix-ups. */
export const ROOM_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const ROOM_CODE_LENGTH = 5
export const MAX_PLAYERS = 8
const NAME_MAX = 24

export interface RoomMember {
  /** Random per room visit – not the sync account, not the buddy number. */
  id: string
  name: string
}

export interface RoomPlayer extends RoomMember {
  ready: boolean
}

/**
 * `lobby`: waiting and getting ready · `cheers`: the host raised the glass, everyone sees it at once ·
 * `play`: a game is on the table (Stufe E5, see party.ts).
 */
export type RoomPhase = 'lobby' | 'cheers' | 'play'

export interface RoomState {
  code: string
  host: string
  /** Bumped on every change, so a late or doubled snapshot never wins over a newer one. */
  seq: number
  phase: RoomPhase
  /** How often the room has toasted. */
  round: number
  /** The host first, then everyone else in the order they arrived. */
  players: RoomPlayer[]
  /** The game while `phase` is `play`, else null. */
  game: PartyGame | null
}

export type RoomIntent =
  | { type: 'ready'; ready: boolean }
  | { type: 'cheers' }
  | { type: 'lobby' }
  /** Host only; the seed comes from the host's UI. */
  | { type: 'start'; game: PartyKind; seed: number }
  | { type: 'stat'; stat: StatKey }
  | { type: 'guess'; ml: number }
  /** Host only: resolve the glass (or the tasting round) without waiting for the last one, then the next glass. */
  | { type: 'reveal' }
  | { type: 'next' }
  /** Tasting-Abend: host only, the beer comes from the host's catalog. */
  | { type: 'pour'; beer: TastingBeer }
  | { type: 'rate'; verdict: TastingVerdict }
  /** Tasting-Abend: host only, close the evening. */
  | { type: 'end' }

/** What the host needs to deal Quartett cards: the card ids and the beers behind them. */
export interface RoomDeck {
  ids: readonly string[]
  lookup: Readonly<Record<string, Beer>>
}

const NO_DECK: RoomDeck = { ids: [], lookup: {} }
/** Quartett needs this many cards (10 each). */
export const DUEL_CARDS = 20

export function roomCode(seed: number): string {
  const rnd = seededRandom(seed ^ 0x2c1b3c6d)
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_ALPHABET[Math.floor(rnd() * ROOM_ALPHABET.length)]
  return code
}

/** A typed code (any case, spaces, dashes) or a whole invite link → the code, or null. */
export function normalizeRoomCode(input: string | null | undefined): string | null {
  if (!input) return null
  const fromLink = /[?&]room=([^&#\s]+)/i.exec(input)
  const code = (fromLink ? fromLink[1] : input).toUpperCase().replace(/[\s-]/g, '')
  if (code.length !== ROOM_CODE_LENGTH) return null
  return [...code].every((c) => ROOM_ALPHABET.includes(c)) ? code : null
}

export function roomLink(origin: string, code: string): string {
  return `${origin}/?room=${code}`
}

export function openRoom(code: string, host: RoomMember): RoomState {
  return {
    code,
    host: host.id,
    seq: 1,
    phase: 'lobby',
    round: 0,
    players: [{ ...host, name: cleanName(host.name), ready: true }],
    game: null,
  }
}

/**
 * The host's view of who is there: newcomers join at the end (several at once by id, so every
 * host would order them alike), whoever left is gone, and nobody gets in past MAX_PLAYERS.
 * The host itself always stays. Back in the lobby when only the host is left or a Quartett player
 * left; a glass resolves once everyone still there has guessed.
 */
export function withPresent(state: RoomState, present: readonly RoomMember[]): RoomState {
  const here = new Map(present.map((m) => [m.id, m]))
  const kept = state.players.filter((p) => p.id === state.host || here.has(p.id))
  const known = new Set(kept.map((p) => p.id))
  const fresh = present
    .filter((m) => !known.has(m.id))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .filter((m, i, all) => all.findIndex((o) => o.id === m.id) === i)
    .slice(0, Math.max(0, MAX_PLAYERS - kept.length))
    .map((m) => ({ id: m.id, name: cleanName(m.name), ready: false }))
  if (!fresh.length && kept.length === state.players.length) return state
  const players = [...kept, ...fresh]
  const next = { ...state, players, seq: state.seq + 1 }
  const game = state.game
  if (players.length < 2 || (game?.kind === 'quartett' && !game.seats.every((id) => here.has(id) || id === state.host))) {
    return state.phase === 'play' ? toLobby(next) : { ...next, phase: players.length < 2 ? 'lobby' : state.phase }
  }
  const ids = players.map((p) => p.id)
  if (game?.kind === 'fill') return { ...next, game: fillSettle(game, ids) }
  if (game?.kind === 'tasting') return { ...next, game: tastingSettle(game, ids) }
  return next
}

/** Back at the table: the game is put away and every guest confirms again. */
function toLobby(state: RoomState): RoomState {
  const players = state.players.map((p) => ({ ...p, ready: p.id === state.host }))
  return { ...state, phase: 'lobby', game: null, players }
}

/** Quartett is for exactly two, everyone ready, and needs a full deck; the others for everyone ready. */
export function canStart(state: RoomState, kind: PartyKind, deckSize = DUEL_CARDS): boolean {
  if (!canCheer(state)) return false
  return kind !== 'quartett' || (state.players.length === 2 && deckSize >= DUEL_CARDS)
}

/** Two or more in the room and every guest ready. */
export function canCheer(state: RoomState): boolean {
  return state.players.length >= 2 && state.players.every((p) => p.ready)
}

/**
 * The host applies a wish from `from`; anything not allowed leaves the state as it is. `deck` is
 * only needed for Quartett.
 */
export function applyIntent(state: RoomState, from: string, intent: RoomIntent, deck: RoomDeck = NO_DECK): RoomState {
  const player = state.players.find((p) => p.id === from)
  if (!player) return state
  const isHost = from === state.host
  switch (intent.type) {
    case 'ready': {
      if (isHost || state.phase !== 'lobby' || player.ready === intent.ready) return state
      const players = state.players.map((p) => (p.id === from ? { ...p, ready: intent.ready } : p))
      return { ...state, players, seq: state.seq + 1 }
    }
    case 'cheers':
      if (!isHost || state.phase !== 'lobby' || !canCheer(state)) return state
      return { ...state, phase: 'cheers', round: state.round + 1, seq: state.seq + 1 }
    case 'lobby':
      // after a round everyone confirms again
      if (!isHost || state.phase === 'lobby') return state
      return { ...toLobby(state), seq: state.seq + 1 }
    case 'start': {
      const ids = deck.ids.filter((id) => deck.lookup[id])
      if (!isHost || state.phase !== 'lobby' || !canStart(state, intent.game, ids.length)) return state
      const game =
        intent.game === 'fill'
          ? newFillParty(intent.seed)
          : intent.game === 'tasting'
            ? newTasting()
            : newDuel([state.players[0].id, state.players[1].id], ids, intent.seed)
      return { ...state, phase: 'play', game, round: state.round + 1, seq: state.seq + 1 }
    }
    case 'stat': {
      const game = state.game
      if (game?.kind !== 'quartett') return state
      return withGame(state, duelPlay(game, from, intent.stat, deck.lookup))
    }
    case 'guess': {
      const game = state.game
      if (game?.kind !== 'fill') return state
      const guessed = fillGuess(game, from, intent.ml)
      return withGame(state, guessed === game ? game : fillSettle(guessed, state.players.map((p) => p.id)))
    }
    case 'reveal':
    case 'next': {
      const game = state.game
      if (!isHost) return state
      if (game?.kind === 'tasting' && intent.type === 'reveal') return withGame(state, tastingReveal(game))
      if (game?.kind !== 'fill') return state
      return withGame(state, intent.type === 'reveal' ? fillReveal(game) : fillNext(game))
    }
    case 'pour':
    case 'end': {
      const game = state.game
      if (!isHost || game?.kind !== 'tasting') return state
      return withGame(state, intent.type === 'pour' ? tastingPour(game, intent.beer) : tastingEnd(game))
    }
    case 'rate': {
      const game = state.game
      if (game?.kind !== 'tasting') return state
      const rated = tastingRate(game, from, intent.verdict)
      return withGame(state, rated === game ? game : tastingSettle(rated, state.players.map((p) => p.id)))
    }
  }
}

function withGame(state: RoomState, game: PartyGame): RoomState {
  return game === state.game ? state : { ...state, game, seq: state.seq + 1 }
}

/** Not in the room and no seat left. */
export function isFull(state: RoomState, id: string): boolean {
  return state.players.length >= MAX_PLAYERS && !state.players.some((p) => p.id === id)
}

/**
 * A guest takes a snapshot from the network only if it is a well-formed state of this room from
 * the host it already follows, and newer than what it has. Everything else is ignored.
 */
export function acceptSnapshot(current: RoomState | null, incoming: unknown, code: string): RoomState | null {
  const s = parseState(incoming)
  if (!s || s.code !== code) return current
  if (current && (s.host !== current.host || s.seq <= current.seq)) return current
  return s
}

export function parseIntent(raw: unknown): RoomIntent | null {
  const i = raw as { type?: unknown; ready?: unknown; stat?: unknown; ml?: unknown; verdict?: unknown } | null
  if (!i || typeof i !== 'object') return null
  if (i.type === 'ready' && typeof i.ready === 'boolean') return { type: 'ready', ready: i.ready }
  if (i.type === 'cheers' || i.type === 'lobby' || i.type === 'reveal' || i.type === 'next') return { type: i.type }
  if (i.type === 'stat') {
    const stat = parseStat(i.stat)
    return stat ? { type: 'stat', stat } : null
  }
  if (i.type === 'guess' && typeof i.ml === 'number' && Number.isFinite(i.ml)) return { type: 'guess', ml: i.ml }
  if (i.type === 'rate') {
    const v = i.verdict as { stars?: unknown; axes?: Record<string, unknown> } | null
    const num = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
    if (!v || typeof v !== 'object' || !num(v.stars) || !v.axes || typeof v.axes !== 'object') return null
    const axes = { bitterness: 0, body: 0, sweetness: 0 }
    for (const a of TASTING_AXES) {
      const n = v.axes[a]
      if (!num(n)) return null
      axes[a] = n
    }
    return { type: 'rate', verdict: { stars: v.stars, axes } }
  }
  // `start`, `pour` and `end` never come over the network: only the host does them, on its own device
  return null
}

function parseState(raw: unknown): RoomState | null {
  const s = raw as Partial<Record<keyof RoomState, unknown>> | null
  if (!s || typeof s !== 'object') return null
  const { code, host, seq, phase, round, players } = s
  if (typeof code !== 'string' || typeof host !== 'string' || !host) return null
  if (!isCount(seq) || !isCount(round) || (phase !== 'lobby' && phase !== 'cheers' && phase !== 'play')) return null
  const game = phase === 'play' ? parseGame(s.game) : null
  if (phase === 'play' && !game) return null
  if (!Array.isArray(players) || !players.length || players.length > MAX_PLAYERS) return null
  const list: RoomPlayer[] = []
  for (const p of players as Partial<RoomPlayer>[]) {
    if (!p || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || typeof p.ready !== 'boolean') return null
    if (list.some((o) => o.id === p.id)) return null
    list.push({ id: p.id, name: cleanName(p.name), ready: p.ready })
  }
  if (list[0].id !== host) return null
  return { code, host, seq, phase, round, players: list, game }
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

/** Names come from other devices: one line, no control characters, short. */
export function cleanName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX) || '?'
}
