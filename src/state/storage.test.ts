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
