import { describe, expect, it } from 'vitest'
import { evaluateAchievements, newlyUnlocked } from './achievements'
import type { RatingCounts } from './types'

const c = (p: Partial<RatingCounts>): RatingCounts => ({ LIKE: 0, DISLIKE: 0, KNOW: 0, UNKNOWN: 0, WANT_TO_TRY: 0, total: 0, ...p })

describe('achievements', () => {
  it('nothing unlocked at start', () => {
    expect(evaluateAchievements(c({}), 0).every((a) => !a.unlocked)).toBe(true)
  })
  it('unlocks by counts and decoded', () => {
    const list = evaluateAchievements(c({ total: 10, DISLIKE: 5, WANT_TO_TRY: 3, UNKNOWN: 3, LIKE: 15 }), 100)
    const by = Object.fromEntries(list.map((a) => [a.id, a.unlocked]))
    expect(by['first-date']).toBe(true)
    expect(by['pils-neuling']).toBe(true)
    expect(by['hohe-ansprueche']).toBe(true)
    expect(by['neugiernase']).toBe(true)
    expect(by['ehrlich']).toBe(true)
    expect(by['entschluesselt']).toBe(true)
    expect(by['hopfen-herz']).toBe(true)
    expect(by['pils-fluesterer']).toBe(false)
  })
  it('reports newly unlocked ones', () => {
    const fresh = newlyUnlocked(c({ total: 9 }), c({ total: 10 }), 64, 71)
    expect(fresh.map((a) => a.id)).toEqual(['pils-neuling'])
  })
})
