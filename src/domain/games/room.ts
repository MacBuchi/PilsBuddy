import { seededRandom } from './quartett'

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

/** `lobby`: waiting and getting ready · `cheers`: the host raised the glass, everyone sees it at once. */
export type RoomPhase = 'lobby' | 'cheers'

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
}

export type RoomIntent = { type: 'ready'; ready: boolean } | { type: 'cheers' } | { type: 'lobby' }

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
  return { code, host: host.id, seq: 1, phase: 'lobby', round: 0, players: [{ ...host, name: cleanName(host.name), ready: true }] }
}

/**
 * The host's view of who is there: newcomers join at the end (several at once by id, so every
 * host would order them alike), whoever left is gone, and nobody gets in past MAX_PLAYERS.
 * The host itself always stays. Back in the lobby when only the host is left.
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
  const phase = players.length < 2 ? 'lobby' : state.phase
  return { ...state, players, phase, seq: state.seq + 1 }
}

/** Two or more in the room and every guest ready. */
export function canCheer(state: RoomState): boolean {
  return state.players.length >= 2 && state.players.every((p) => p.ready)
}

/** The host applies a wish from `from`; anything not allowed leaves the state as it is. */
export function applyIntent(state: RoomState, from: string, intent: RoomIntent): RoomState {
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
    case 'lobby': {
      if (!isHost || state.phase === 'lobby') return state
      // after a round everyone confirms again
      const players = state.players.map((p) => ({ ...p, ready: p.id === state.host }))
      return { ...state, phase: 'lobby', players, seq: state.seq + 1 }
    }
  }
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
  const i = raw as { type?: unknown; ready?: unknown } | null
  if (!i || typeof i !== 'object') return null
  if (i.type === 'ready' && typeof i.ready === 'boolean') return { type: 'ready', ready: i.ready }
  if (i.type === 'cheers' || i.type === 'lobby') return { type: i.type }
  return null
}

function parseState(raw: unknown): RoomState | null {
  const s = raw as Partial<Record<keyof RoomState, unknown>> | null
  if (!s || typeof s !== 'object') return null
  const { code, host, seq, phase, round, players } = s
  if (typeof code !== 'string' || typeof host !== 'string' || !host) return null
  if (!isCount(seq) || !isCount(round) || (phase !== 'lobby' && phase !== 'cheers')) return null
  if (!Array.isArray(players) || !players.length || players.length > MAX_PLAYERS) return null
  const list: RoomPlayer[] = []
  for (const p of players as Partial<RoomPlayer>[]) {
    if (!p || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || typeof p.ready !== 'boolean') return null
    if (list.some((o) => o.id === p.id)) return null
    list.push({ id: p.id, name: cleanName(p.name), ready: p.ready })
  }
  if (list[0].id !== host) return null
  return { code, host, seq, phase, round, players: list }
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

/** Names come from other devices: one line, no control characters, short. */
export function cleanName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX) || '?'
}
