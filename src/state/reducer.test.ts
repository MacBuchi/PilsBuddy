import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './reducer'
import type { Action, AppState } from './reducer'

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s)
const fresh = () => initialState({ ratings: {}, ageConfirmed: true, onboarded: false, dark: false, buddyNo: 1234, seen: [] })

describe('reducer', () => {
  it('GO to dna marks the user as onboarded, other screens do not', () => {
    expect(run(fresh(), { type: 'GO', screen: 'swipe' }).profile.onboarded).toBe(false)
    const s = run(fresh(), { type: 'GO', screen: 'dna' })
    expect(s.profile.onboarded).toBe(true)
    expect(s.prevScreen).toBe('welcome')
  })

  it('OPEN_DETAIL remembers where it came from, also across detail → detail', () => {
    const s = run(fresh(), { type: 'GO', screen: 'matches' }, { type: 'OPEN_DETAIL', id: 'jever' }, { type: 'OPEN_DETAIL', id: 'becks' })
    expect(s.screen).toBe('detail')
    expect(s.detailId).toBe('becks')
    expect(s.detailFrom).toBe('matches')
  })

  it('RATE stores the rating and remembers it for undo', () => {
    const s = run(fresh(), { type: 'RATE', id: 'jever', rating: 'LIKE', at: 1 })
    expect(s.profile.ratings.jever).toEqual({ rating: 'LIKE', at: 1 })
    expect(s.lastRated).toEqual({ id: 'jever', rating: 'LIKE', previous: null })
  })

  it('UNRATE removes a fresh rating', () => {
    const s = run(fresh(), { type: 'RATE', id: 'jever', rating: 'LIKE', at: 1 }, { type: 'UNRATE' })
    expect(s.profile.ratings.jever).toBeUndefined()
    expect(s.lastRated).toBeNull()
  })

  it('UNRATE restores a changed rating (detail screen) instead of deleting it', () => {
    const s = run(
      fresh(),
      { type: 'RATE', id: 'jever', rating: 'WANT_TO_TRY', at: 1 },
      { type: 'RATE', id: 'jever', rating: 'DISLIKE', at: 2 },
      { type: 'UNRATE' },
    )
    expect(s.profile.ratings.jever).toEqual({ rating: 'WANT_TO_TRY', at: 1 })
  })

  it('RATE keeps the replaced rating as previous (Probierliste → verdict)', () => {
    const s = run(
      fresh(),
      { type: 'RATE', id: 'jever', rating: 'WANT_TO_TRY', at: 1 },
      { type: 'RATE', id: 'jever', rating: 'LIKE', at: 2 },
    )
    expect(s.profile.ratings.jever).toEqual({ rating: 'LIKE', at: 2, previous: 'WANT_TO_TRY' })
    // same rating again keeps the history
    const again = reducer(s, { type: 'RATE', id: 'jever', rating: 'LIKE', at: 3 })
    expect(again.profile.ratings.jever.previous).toBe('WANT_TO_TRY')
  })

  it('undo is one step: a second UNRATE changes nothing', () => {
    const once = run(
      fresh(),
      { type: 'RATE', id: 'jever', rating: 'LIKE', at: 1 },
      { type: 'RATE', id: 'becks', rating: 'DISLIKE', at: 2 },
      { type: 'UNRATE' },
    )
    expect(Object.keys(once.profile.ratings)).toEqual(['jever'])
    expect(reducer(once, { type: 'UNRATE' })).toBe(once)
  })

  it('MARK_SEEN remembers a moment once; RESET forgets them', () => {
    const s = run(fresh(), { type: 'MARK_SEEN', id: 'entschluesselt' })
    expect(s.profile.seen).toEqual(['entschluesselt'])
    expect(reducer(s, { type: 'MARK_SEEN', id: 'entschluesselt' })).toBe(s)
    expect(reducer(s, { type: 'RESET' }).profile.seen).toEqual([])
  })

  it('IMPORT replaces the profile and clears undo', () => {
    const rated = run(fresh(), { type: 'RATE', id: 'jever', rating: 'LIKE', at: 1 })
    const other = { ...fresh().profile, ratings: { becks: { rating: 'DISLIKE' as const, at: 5 } }, buddyNo: 42 }
    const s = reducer(rated, { type: 'IMPORT', profile: other })
    expect(s.profile).toBe(other)
    expect(s.lastRated).toBeNull()
  })

  it('RESTART_DECK and RESET clear undo; RESET keeps dark mode', () => {
    const rated = run(fresh(), { type: 'TOGGLE_DARK' }, { type: 'RATE', id: 'jever', rating: 'LIKE', at: 1 })
    expect(run(rated, { type: 'RESTART_DECK' }).lastRated).toBeNull()
    const reset = run(rated, { type: 'RESET' })
    expect(reset.lastRated).toBeNull()
    expect(reset.profile.ratings).toEqual({})
    expect(reset.profile.dark).toBe(true)
    expect(reset.profile.ageConfirmed).toBe(false)
  })
})
