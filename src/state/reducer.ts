import type { BuddySnapshot } from '../domain/buddyLink'
import type { Rating, RatingEntry, Ratings } from '../domain/types'

export type Screen =
  | 'welcome'
  | 'howto'
  | 'swipe'
  | 'analyzing'
  | 'dna'
  | 'avatar'
  | 'match'
  | 'detail'
  | 'matches'
  | 'profile'
  | 'legal'
  | 'games'
  | 'quartett'

export type MatchTab = 'biere' | 'probieren' | 'menschen'

/** Screens that show the bottom tab bar once the user is onboarded. */
export const TAB_SCREENS = ['swipe', 'dna', 'matches', 'games', 'profile'] as const satisfies readonly Screen[]

/** The part of the state that survives a reload. */
export interface Profile {
  ratings: Ratings
  ageConfirmed: boolean
  /** True once the user has seen their DNA at least once → tab bar appears. */
  onboarded: boolean
  dark: boolean
  /** Stable pseudo-id shown as "Buddy #0427"; later replaced by a real account id. */
  buddyNo: number
  /** Achievement moments already shown (full-screen overlay appears once per id). */
  seen: string[]
  /** The last buddy whose link was opened (Stufe C1) – compared in Matches › Menschen. */
  buddy: BuddySnapshot | null
  /** Device sync (Stufe B2): opt-in; the Sync-Code puts another device into the same account. */
  sync: SyncSettings
  /** Mini games (Stufe E): finished games per game, device-local. */
  games: GameStats
}

export interface GameRecord {
  played: number
  won: number
}

export interface GameStats {
  quartett: GameRecord
}

export const NO_GAMES: GameStats = { quartett: { played: 0, won: 0 } }

export interface SyncSettings {
  on: boolean
  /** PILS-XXXX-…; kept on the device (and in the export file) so it survives updates. */
  code: string | null
}

export interface AppState {
  profile: Profile
  screen: Screen
  prevScreen: Screen
  /** Where the detail screen was opened from, to return there. */
  detailFrom: Screen
  detailId: string | null
  matchTab: MatchTab
  /** One-step undo: the last rated beer and what it was before (null = unrated). Not persisted. */
  lastRated: { id: string; rating: Rating; previous: RatingEntry | null } | null
}

export type Action =
  | { type: 'GO'; screen: Screen }
  | { type: 'OPEN_DETAIL'; id: string }
  | { type: 'RATE'; id: string; rating: Rating; at: number }
  | { type: 'UNRATE' }
  | { type: 'SET_AGE'; value: boolean }
  | { type: 'SET_ONBOARDED' }
  | { type: 'TOGGLE_DARK' }
  | { type: 'SET_MATCH_TAB'; tab: MatchTab }
  | { type: 'RESTART_DECK' }
  | { type: 'MARK_SEEN'; id: string }
  | { type: 'IMPORT'; profile: Profile }
  | { type: 'SET_BUDDY'; buddy: BuddySnapshot | null }
  | { type: 'RESET' }
  | { type: 'GAME_OVER'; game: keyof GameStats; won: boolean }
  | { type: 'SET_SYNC'; sync: Partial<SyncSettings> }
  /** Result of a cloud sync, computed from `sent`; ratings changed meanwhile on this device are kept. */
  | { type: 'SYNC_APPLY'; sent: Ratings; result: Ratings; adopt?: Partial<Pick<Profile, 'buddyNo' | 'onboarded' | 'dark'>> }

function sameEntry(a: RatingEntry | undefined, b: RatingEntry | undefined): boolean {
  return a === b || (!!a && !!b && a.rating === b.rating && a.at === b.at && a.previous === b.previous)
}

export function newBuddyNo(): number {
  return 100 + Math.floor(Math.random() * 9900)
}

export function initialProfile(): Profile {
  return { ratings: {}, ageConfirmed: false, onboarded: false, dark: false, buddyNo: newBuddyNo(), seen: [], buddy: null, sync: { on: false, code: null }, games: NO_GAMES }
}

export function initialState(profile: Profile = initialProfile()): AppState {
  return {
    profile,
    screen: 'welcome',
    prevScreen: 'welcome',
    detailFrom: 'swipe',
    detailId: null,
    matchTab: 'biere',
    lastRated: null,
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'GO': {
      if (action.screen === state.screen) return state
      // Seeing the DNA is the moment the user is "onboarded": tabs appear from here on.
      const profile = action.screen === 'dna' && !state.profile.onboarded ? { ...state.profile, onboarded: true } : state.profile
      return { ...state, profile, screen: action.screen, prevScreen: state.screen }
    }
    case 'OPEN_DETAIL':
      return {
        ...state,
        screen: 'detail',
        prevScreen: state.screen,
        detailFrom: state.screen === 'detail' ? state.detailFrom : state.screen,
        detailId: action.id,
      }
    case 'RATE': {
      const old = state.profile.ratings[action.id]
      const previous = old && old.rating !== action.rating ? old.rating : old?.previous
      const entry: RatingEntry = previous ? { rating: action.rating, at: action.at, previous } : { rating: action.rating, at: action.at }
      return {
        ...state,
        profile: {
          ...state.profile,
          ratings: { ...state.profile.ratings, [action.id]: entry },
        },
        lastRated: { id: action.id, rating: action.rating, previous: old ?? null },
      }
    }
    case 'UNRATE': {
      const last = state.lastRated
      if (!last) return state
      const ratings = { ...state.profile.ratings }
      if (last.previous) ratings[last.id] = last.previous
      else delete ratings[last.id]
      return { ...state, profile: { ...state.profile, ratings }, lastRated: null }
    }
    case 'SET_AGE':
      return { ...state, profile: { ...state.profile, ageConfirmed: action.value } }
    case 'SET_ONBOARDED':
      if (state.profile.onboarded) return state
      return { ...state, profile: { ...state.profile, onboarded: true } }
    case 'TOGGLE_DARK':
      return { ...state, profile: { ...state.profile, dark: !state.profile.dark } }
    case 'SET_MATCH_TAB':
      return { ...state, matchTab: action.tab }
    case 'RESTART_DECK':
      return { ...state, profile: { ...state.profile, ratings: {} }, lastRated: null }
    case 'MARK_SEEN':
      if (state.profile.seen.includes(action.id)) return state
      return { ...state, profile: { ...state.profile, seen: [...state.profile.seen, action.id] } }
    case 'SET_BUDDY':
      return { ...state, profile: { ...state.profile, buddy: action.buddy } }
    case 'IMPORT':
      // a restored profile is by definition past the age gate and onboarding it had
      return { ...state, profile: action.profile, lastRated: null }
    case 'RESET':
      return initialState({ ...initialProfile(), dark: state.profile.dark })
    case 'GAME_OVER': {
      const rec = state.profile.games[action.game]
      const games = { ...state.profile.games, [action.game]: { played: rec.played + 1, won: rec.won + (action.won ? 1 : 0) } }
      return { ...state, profile: { ...state.profile, games } }
    }
    case 'SET_SYNC':
      return { ...state, profile: { ...state.profile, sync: { ...state.profile.sync, ...action.sync } } }
    case 'SYNC_APPLY': {
      const ratings = { ...state.profile.ratings }
      let changed = false
      for (const id of new Set([...Object.keys(action.sent), ...Object.keys(action.result)])) {
        if (!sameEntry(ratings[id], action.sent[id])) continue // rated again while syncing – keep it
        if (sameEntry(ratings[id], action.result[id])) continue
        if (action.result[id]) ratings[id] = action.result[id]
        else delete ratings[id]
        changed = true
      }
      if (!changed && !action.adopt) return state
      return { ...state, profile: { ...state.profile, ...action.adopt, ratings: changed ? ratings : state.profile.ratings } }
    }
  }
}
