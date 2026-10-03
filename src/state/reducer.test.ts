import { describe, expect, it } from 'vitest'
import { initialState, NO_GAMES, reducer } from './reducer'
import type { Action, AppState } from './reducer'

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s)
const fresh = () => initialState({ ratings: {}, ageConfirmed: true, onboarded: false, dark: false, buddyNo: 1234, seen: [], buddy: null, sync: { on: false, code: null }, games: NO_GAMES })

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

  it('GO map remembers the screen it was opened from – not a beer detail on the way back', () => {
    const s = run(fresh(), { type: 'GO', screen: 'matches' }, { type: 'GO', screen: 'map' }, { type: 'OPEN_DETAIL', id: 'jever' }, { type: 'GO', screen: 'map' })
    expect(s.screen).toBe('map')
    expect(s.mapFrom).toBe('matches')
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

describe('sync', () => {
  const rated = () => run(fresh(), { type: 'RATE', id: 'jever', rating: 'LIKE', at: 5 })

  it('SET_SYNC merges settings, RESET turns sync off', () => {
    const s = run(fresh(), { type: 'SET_SYNC', sync: { on: true } }, { type: 'SET_SYNC', sync: { code: 'PILS-AAAA-BBBB-CCCC-DDDD' } })
    expect(s.profile.sync).toEqual({ on: true, code: 'PILS-AAAA-BBBB-CCCC-DDDD' })
    expect(run(s, { type: 'RESET' }).profile.sync).toEqual({ on: false, code: null })
  })

  it('SYNC_APPLY takes the merged ratings', () => {
    const s = rated()
    const next = run(s, {
      type: 'SYNC_APPLY',
      sent: s.profile.ratings,
      result: { becks: { rating: 'DISLIKE', at: 3 } },
    })
    expect(next.profile.ratings).toEqual({ becks: { rating: 'DISLIKE', at: 3 } })
  })

  it('SYNC_APPLY keeps what was rated while the sync ran', () => {
    const s = rated()
    const sent = s.profile.ratings
    const during = run(s, { type: 'RATE', id: 'jever', rating: 'DISLIKE', at: 9 })
    const next = run(during, { type: 'SYNC_APPLY', sent, result: { jever: { rating: 'KNOW', at: 7 } } })
    expect(next.profile.ratings.jever.rating).toBe('DISLIKE')
  })

  it('SYNC_APPLY can adopt the account profile on a joined device', () => {
    const s = rated()
    const next = run(s, { type: 'SYNC_APPLY', sent: s.profile.ratings, result: s.profile.ratings, adopt: { buddyNo: 4711, onboarded: true } })
    expect(next.profile.buddyNo).toBe(4711)
    expect(next.profile.onboarded).toBe(true)
  })

  it('GAME_OVER counts games and wins; RESET clears them', () => {
    const s = run(fresh(), { type: 'GAME_OVER', game: 'quartett', won: true }, { type: 'GAME_OVER', game: 'quartett', won: false })
    expect(s.profile.games.quartett).toEqual({ played: 2, won: 1 })
    expect(run(s, { type: 'RESET' }).profile.games).toEqual(NO_GAMES)
  })
})
