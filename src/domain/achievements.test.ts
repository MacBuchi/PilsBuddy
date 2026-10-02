import { describe, expect, it } from 'vitest'
import { evaluateAchievements, keptPromises, newlyUnlocked, progressOf, regionalLikes, unlockedIds } from './achievements'
import type { Progress } from './achievements'
import type { RatingCounts } from './types'

const c = (p: Partial<RatingCounts>): RatingCounts => ({ LIKE: 0, DISLIKE: 0, KNOW: 0, UNKNOWN: 0, WANT_TO_TRY: 0, total: 0, ...p })
const pr = (counts: Partial<RatingCounts>, decoded = 0, kept = 0): Progress => ({ counts: c(counts), decoded, kept, quartettWins: 0, regionalLikes: 0 })

describe('achievements', () => {
  it('nothing unlocked at start', () => {
    expect(evaluateAchievements(pr({})).every((a) => !a.unlocked)).toBe(true)
  })

  it('unlocks by counts and decoded', () => {
    const list = evaluateAchievements(pr({ total: 10, DISLIKE: 5, WANT_TO_TRY: 3, UNKNOWN: 3, LIKE: 15 }, 100))
    const by = Object.fromEntries(list.map((a) => [a.id, a.unlocked]))
    expect(by['first-date']).toBe(true)
    expect(by['pils-neuling']).toBe(true)
    expect(by['hohe-ansprueche']).toBe(true)
    expect(by['neugiernase']).toBe(true)
    expect(by['ehrlich']).toBe(true)
    expect(by['entschluesselt']).toBe(true)
    expect(by['hopfen-herz']).toBe(true)
    expect(by['pils-fluesterer']).toBe(false)
    expect(by['wort-gehalten']).toBe(false)
  })

  it('reports newly unlocked ones', () => {
    const fresh = newlyUnlocked(pr({ total: 9 }, 64), pr({ total: 10 }, 71))
    expect(fresh.map((a) => a.id)).toEqual(['pils-neuling'])
  })

  it('"Wort gehalten" counts Probierliste beers that got a verdict', () => {
    const ratings = {
      a: { rating: 'LIKE' as const, at: 1, previous: 'WANT_TO_TRY' as const },
      b: { rating: 'DISLIKE' as const, at: 2, previous: 'WANT_TO_TRY' as const },
      c: { rating: 'KNOW' as const, at: 3, previous: 'UNKNOWN' as const },
      d: { rating: 'WANT_TO_TRY' as const, at: 4 },
    }
    expect(keptPromises(ratings)).toBe(2)
    const before = progressOf(ratings)
    const after = progressOf({ ...ratings, d: { rating: 'LIKE', at: 5, previous: 'WANT_TO_TRY' } })
    expect(after.kept).toBe(3)
    expect(newlyUnlocked(before, after).map((x) => x.id)).toContain('wort-gehalten')
  })

  it('Quartett-König after three wins against the bot', () => {
    const before = progressOf({}, { quartett: { won: 2 } })
    const after = progressOf({}, { quartett: { won: 3 } })
    expect(newlyUnlocked(before, after).map((x) => x.id)).toEqual(['quartett-koenig'])
    expect(progressOf({}).quartettWins).toBe(0)
  })
})

describe('Lokalpatriot (R5)', () => {
  it('needs three regional beers with a heart – other verdicts and curated beers do not count', () => {
    const r = (id: string, rating: 'LIKE' | 'KNOW') => [id, { rating, at: 1 }] as const
    const two = Object.fromEntries([r('r-1', 'LIKE'), r('r-2', 'LIKE'), r('r-3', 'KNOW'), r('jever', 'LIKE')])
    expect(regionalLikes(two)).toBe(2)
    expect(unlockedIds(progressOf(two))).not.toContain('lokalpatriot')
    expect(unlockedIds(progressOf({ ...two, 'r-app7': { rating: 'LIKE', at: 2 } }))).toContain('lokalpatriot')
  })
})
