import { describe, expect, it } from 'vitest'
import { createLocalStore, parseProfile, serializeProfile, STORAGE_KEY } from './storage'
import { initialProfile, NO_GAMES } from './reducer'

function memoryStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    map: m,
  }
}

describe('storage', () => {
  it('old profiles without "seen" treat already unlocked achievements as seen', () => {
    const ratings = Object.fromEntries(['a', 'b', 'c'].map((id, i) => [id, { rating: 'LIKE', at: i }]))
    const p = parseProfile(JSON.stringify({ v: 1, profile: { ratings } }))!
    expect(p.seen).toContain('first-date')
    const q = parseProfile(JSON.stringify({ v: 1, profile: { ratings, seen: ['x', 3] } }))!
    expect(q.seen).toEqual(['x'])
  })

  it('keeps a valid previous rating and drops junk', () => {
    const json = JSON.stringify({
      v: 1,
      profile: {
        ratings: {
          a: { rating: 'LIKE', at: 1, previous: 'WANT_TO_TRY' },
          b: { rating: 'LIKE', at: 2, previous: 'MAYBE' },
          c: { rating: 'LIKE', at: 3, previous: 'LIKE' },
        },
      },
    })
    const r = parseProfile(json)!.ratings
    expect(r.a.previous).toBe('WANT_TO_TRY')
    expect(r.b).toEqual({ rating: 'LIKE', at: 2 })
    expect(r.c).toEqual({ rating: 'LIKE', at: 3 })
  })

  it('keeps sync settings, drops malformed codes, defaults to off for old profiles', () => {
    const load = (sync: unknown) => parseProfile(JSON.stringify({ v: 1, profile: { ratings: {}, sync } }))!.sync
    expect(load({ on: true, code: 'PILS-7K3Q-M9XD-2HTA-WXYZ' })).toEqual({ on: true, code: 'PILS-7K3Q-M9XD-2HTA-WXYZ' })
    expect(load({ on: 'yes', code: 'PILS-0000-1111-OOOO-IIII' })).toEqual({ on: false, code: null })
    expect(load(undefined)).toEqual({ on: false, code: null })
  })

  it('round-trips a profile', () => {
    const p = { ...initialProfile(), ratings: { jever: { rating: 'LIKE' as const, at: 5 } }, onboarded: true }
    expect(parseProfile(serializeProfile(p))).toEqual(p)
  })
  it('drops garbage and unknown ratings', () => {
    const json = JSON.stringify({
      v: 1,
      profile: { ratings: { a: { rating: 'LIKE', at: 1 }, b: { rating: 'MEH' }, c: 'x' }, ageConfirmed: 'yes', dark: true },
    })
    const p = parseProfile(json)!
    expect(Object.keys(p.ratings)).toEqual(['a'])
    expect(p.ageConfirmed).toBe(false)
    expect(p.dark).toBe(true)
    expect(p.onboarded).toBe(false)
  })
  it('keeps the AI opt-in only when it is exactly true (older profiles: off)', () => {
    const parse = (ai: unknown) => parseProfile(JSON.stringify({ v: 1, profile: { ratings: {}, ai } }))!.ai
    expect(parse(true)).toBe(true)
    expect(parse('yes')).toBe(false)
    expect(parse(undefined)).toBe(false)
  })
  it('returns null for invalid input', () => {
    expect(parseProfile(null)).toBeNull()
    expect(parseProfile('{not json')).toBeNull()
    expect(parseProfile('42')).toBeNull()
  })
  it('store saves, loads and clears', () => {
    const s = memoryStorage()
    const store = createLocalStore(s)
    expect(store.load()).toBeNull()
    const p = { ...initialProfile(), ageConfirmed: true }
    store.save(p)
    expect(s.map.has(STORAGE_KEY)).toBe(true)
    expect(store.load()).toEqual(p)
    store.clear()
    expect(store.load()).toBeNull()
  })
  it('survives a broken storage', () => {
    const store = createLocalStore(null)
    expect(() => store.save(initialProfile())).not.toThrow()
    expect(store.load()).toBeNull()
  })

  it('game stats survive a reload; junk and old profiles count as nothing played', () => {
    const games = { quartett: { played: 5, won: 3 }, fill: { played: 2, won: 1, best: 412 }, memory: { played: 3, won: 1, best: { bottles: 15, style: 0 } }, quiz: { played: 4, won: 2, best: 8 }, bierionaer: { played: 3, won: 0, best: 32000 } }
    const p = { ...initialProfile(), games }
    expect(parseProfile(serializeProfile(p))?.games).toEqual(games)
    const old = JSON.stringify({ v: 1, profile: { ...initialProfile(), games: undefined } })
    expect(parseProfile(old)?.games).toEqual(NO_GAMES)
    // profiles from before E2 have no fill record
    const e1 = JSON.stringify({ v: 1, profile: { ...initialProfile(), games: { quartett: { played: 4, won: 1 } } } })
    expect(parseProfile(e1)?.games).toEqual({ ...NO_GAMES, quartett: { played: 4, won: 1 } })
    const junk = JSON.stringify({ v: 1, profile: { ...initialProfile(), games: { quartett: { played: 2, won: 9 }, fill: { played: 0, won: 0, best: 300 } } } })
    expect(parseProfile(junk)?.games).toEqual({ ...NO_GAMES, quartett: { played: 2, won: 2 } })
    // profiles from before E3 have no memory record; a best without a game played is junk
    const e2 = JSON.stringify({ v: 1, profile: { ...initialProfile(), games: { quartett: { played: 1, won: 0 }, fill: games.fill } } })
    expect(parseProfile(e2)?.games.memory).toEqual(NO_GAMES.memory)
    const memJunk = JSON.stringify({ v: 1, profile: { ...initialProfile(), games: { memory: { played: 0, won: 0, best: { bottles: 9, style: 'x' } } } } })
    expect(parseProfile(memJunk)?.games.memory).toEqual(NO_GAMES.memory)
    const memOk = JSON.stringify({ v: 1, profile: { ...initialProfile(), games: { memory: { played: 2, won: 1, best: { bottles: 12, style: -3 } } } } })
    expect(parseProfile(memOk)?.games.memory).toEqual({ played: 2, won: 1, best: { bottles: 12, style: 0 } })
    // profiles from before E7 have no quiz record; a best above the question count is clamped
    expect(parseProfile(e2)?.games.quiz).toEqual(NO_GAMES.quiz)
    const quizBig = JSON.stringify({ v: 1, profile: { ...initialProfile(), games: { quiz: { played: 1, won: 1, best: 99 } } } })
    expect(parseProfile(quizBig)?.games.quiz).toEqual({ played: 1, won: 1, best: 10 })
    // before E9: no Bierionär record; more than the million is junk
    expect(parseProfile(e2)?.games.bierionaer).toEqual(NO_GAMES.bierionaer)
    const rich = JSON.stringify({ v: 1, profile: { ...initialProfile(), games: { bierionaer: { played: 2, won: 1, best: 5e9 } } } })
    expect(parseProfile(rich)?.games.bierionaer).toEqual({ played: 2, won: 1, best: 1000000 })
  })
})
