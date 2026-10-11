import { describe, expect, it } from 'vitest'
import {
  acceptSnapshot,
  applyIntent,
  canCheer,
  cleanName,
  isFull,
  MAX_PLAYERS,
  normalizeRoomCode,
  openRoom,
  parseIntent,
  ROOM_ALPHABET,
  ROOM_CODE_LENGTH,
  roomCode,
  roomLink,
  withPresent,
} from './room'
import type { RoomMember } from './room'

const host: RoomMember = { id: 'h', name: 'Buddy #0427' }
const anna: RoomMember = { id: 'a', name: 'Buddy #1200' }
const ben: RoomMember = { id: 'b', name: 'Buddy #3301' }

const lobby = () => withPresent(openRoom('K7Q2M', host), [host, anna, ben])

describe('room code', () => {
  it('is deterministic per seed and uses only unambiguous characters', () => {
    expect(roomCode(42)).toBe(roomCode(42))
    expect(roomCode(42)).not.toBe(roomCode(43))
    for (let seed = 0; seed < 200; seed++) {
      const code = roomCode(seed)
      expect(code).toHaveLength(ROOM_CODE_LENGTH)
      expect([...code].every((c) => ROOM_ALPHABET.includes(c))).toBe(true)
    }
    expect(ROOM_ALPHABET).not.toMatch(/[01ILO]/)
  })

  it('normalizes typed codes and invite links', () => {
    expect(normalizeRoomCode(' k7q-2m ')).toBe('K7Q2M')
    expect(normalizeRoomCode('k7q2m')).toBe('K7Q2M')
    expect(normalizeRoomCode('K7Q 2M')).toBe('K7Q2M')
    expect(normalizeRoomCode(roomLink('https://pilsbuddy.mcbuchi.de', 'K7Q2M'))).toBe('K7Q2M')
    expect(normalizeRoomCode('https://x.de/?lang=en&room=k7q2m#top')).toBe('K7Q2M')
    expect(normalizeRoomCode('K7Q2O')).toBe(null) // O is not in the alphabet
    expect(normalizeRoomCode('K7Q2MM')).toBe(null)
    expect(normalizeRoomCode('')).toBe(null)
    expect(normalizeRoomCode(null)).toBe(null)
  })
})

describe('presence', () => {
  it('keeps the host first and adds newcomers in id order, not ready', () => {
    const s = withPresent(openRoom('K7Q2M', host), [ben, host, anna])
    expect(s.players.map((p) => p.id)).toEqual(['h', 'a', 'b'])
    expect(s.players.map((p) => p.ready)).toEqual([true, false, false])
    expect(s.seq).toBe(2)
  })

  it('appends later arrivals at the end and drops who left', () => {
    const s = withPresent(openRoom('K7Q2M', host), [host, ben])
    const t = withPresent(s, [host, anna, ben])
    expect(t.players.map((p) => p.id)).toEqual(['h', 'b', 'a'])
    const u = withPresent(t, [anna])
    expect(u.players.map((p) => p.id)).toEqual(['h', 'a']) // the host never drops itself
  })

  it('returns the same state when nobody came or went', () => {
    const s = lobby()
    expect(withPresent(s, [anna, host, ben])).toBe(s)
  })

  it('ignores duplicate presences and caps the room', () => {
    const crowd = Array.from({ length: 12 }, (_, i) => ({ id: `p${String(i).padStart(2, '0')}`, name: `P${i}` }))
    const s = withPresent(openRoom('K7Q2M', host), [host, crowd[0], crowd[0], ...crowd])
    expect(s.players).toHaveLength(MAX_PLAYERS)
    expect(new Set(s.players.map((p) => p.id)).size).toBe(MAX_PLAYERS)
    expect(isFull(s, 'p11')).toBe(true)
    expect(isFull(s, 'p00')).toBe(false)
  })

  it('falls back to the lobby when the host is alone', () => {
    let s = applyIntent(lobby(), 'a', { type: 'ready', ready: true })
    s = applyIntent(s, 'b', { type: 'ready', ready: true })
    s = applyIntent(s, 'h', { type: 'cheers' })
    expect(s.phase).toBe('cheers')
    expect(withPresent(s, [host]).phase).toBe('lobby')
  })
})

describe('intents', () => {
  it('lets the host toast only when every guest is ready', () => {
    let s = lobby()
    expect(canCheer(s)).toBe(false)
    expect(applyIntent(s, 'h', { type: 'cheers' })).toBe(s)
    s = applyIntent(s, 'a', { type: 'ready', ready: true })
    s = applyIntent(s, 'b', { type: 'ready', ready: true })
    expect(canCheer(s)).toBe(true)
    const t = applyIntent(s, 'h', { type: 'cheers' })
    expect(t).toMatchObject({ phase: 'cheers', round: 1, seq: s.seq + 1 })
  })

  it('a lone host cannot toast', () => {
    const s = openRoom('K7Q2M', host)
    expect(applyIntent(s, 'h', { type: 'cheers' })).toBe(s)
  })

  it('only the host toasts and leads back; guests only change their own ready', () => {
    let s = applyIntent(lobby(), 'a', { type: 'ready', ready: true })
    s = applyIntent(s, 'b', { type: 'ready', ready: true })
    expect(applyIntent(s, 'a', { type: 'cheers' })).toBe(s)
    expect(applyIntent(s, 'stranger', { type: 'ready', ready: true })).toBe(s)
    expect(applyIntent(s, 'h', { type: 'ready', ready: false })).toBe(s)
    const t = applyIntent(s, 'h', { type: 'cheers' })
    expect(applyIntent(t, 'a', { type: 'lobby' })).toBe(t)
    expect(applyIntent(t, 'a', { type: 'ready', ready: false })).toBe(t)
    const back = applyIntent(t, 'h', { type: 'lobby' })
    expect(back.phase).toBe('lobby')
    expect(back.players.map((p) => p.ready)).toEqual([true, false, false])
    expect(back.round).toBe(1)
  })

  it('an unchanged ready is no change', () => {
    const s = lobby()
    expect(applyIntent(s, 'a', { type: 'ready', ready: false })).toBe(s)
  })

  it('parses only known intents', () => {
    expect(parseIntent({ type: 'ready', ready: true })).toEqual({ type: 'ready', ready: true })
    expect(parseIntent({ type: 'cheers', extra: 1 })).toEqual({ type: 'cheers' })
    expect(parseIntent({ type: 'ready', ready: 'yes' })).toBe(null)
    expect(parseIntent({ type: 'kick' })).toBe(null)
    expect(parseIntent(null)).toBe(null)
    expect(parseIntent('cheers')).toBe(null)
  })
})

describe('snapshots', () => {
  it('takes a newer state of the same room from the same host only', () => {
    const s = lobby()
    expect(acceptSnapshot(null, s, 'K7Q2M')).toEqual(s)
    const newer = applyIntent(s, 'a', { type: 'ready', ready: true })
    expect(acceptSnapshot(s, newer, 'K7Q2M')).toEqual(newer)
    expect(acceptSnapshot(newer, s, 'K7Q2M')).toBe(newer) // late
    expect(acceptSnapshot(newer, newer, 'K7Q2M')).toBe(newer) // doubled
    expect(acceptSnapshot(s, { ...newer, host: 'x', players: [{ id: 'x', name: 'X', ready: true }] }, 'K7Q2M')).toBe(s)
    expect(acceptSnapshot(null, s, 'AAAAA')).toBe(null)
  })

  it('rejects malformed states', () => {
    const s = lobby()
    const bad: unknown[] = [
      null,
      'state',
      { ...s, seq: -1 },
      { ...s, seq: 1.5 },
      { ...s, phase: 'party' },
      { ...s, players: [] },
      { ...s, players: [s.players[1], s.players[0]] }, // host not first
      { ...s, players: [s.players[0], s.players[0]] },
      { ...s, players: [s.players[0], { id: 'z', name: 3, ready: false }] },
      { ...s, players: Array.from({ length: MAX_PLAYERS + 1 }, (_, i) => ({ id: i ? `p${i}` : 'h', name: 'P', ready: true })) },
    ]
    for (const b of bad) expect(acceptSnapshot(null, b, 'K7Q2M')).toBe(null)
  })

  it('cleans names from other devices', () => {
    const s = lobby()
    const t = acceptSnapshot(null, { ...s, players: [s.players[0], { id: 'z', name: '  Bot\u0007tle\n' + 'x'.repeat(40), ready: false }] }, 'K7Q2M')
    expect(t?.players[1].name).toBe('Bottle' + 'x'.repeat(18))
    expect(cleanName('   ')).toBe('?')
  })
})
