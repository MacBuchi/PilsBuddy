import { describe, expect, it } from 'vitest'
import { createLocalStore, parseProfile, serializeProfile, STORAGE_KEY } from './storage'
import { initialProfile } from './reducer'

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
})
