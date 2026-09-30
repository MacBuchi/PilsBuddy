import type { Rating, Ratings } from '../domain/types'

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

export type MatchTab = 'biere' | 'menschen'

/** Screens that show the bottom tab bar once the user is onboarded. */
export const TAB_SCREENS = ['swipe', 'dna', 'matches', 'profile'] as const satisfies readonly Screen[]

/** The part of the state that survives a reload. */
export interface Profile {
  ratings: Ratings
  ageConfirmed: boolean
  /** True once the user has seen their DNA at least once → tab bar appears. */
  onboarded: boolean
  dark: boolean
  /** Stable pseudo-id shown as "Buddy #0427"; later replaced by a real account id. */
  buddyNo: number
}

export interface AppState {
  profile: Profile
  screen: Screen
  prevScreen: Screen
  /** Where the detail screen was opened from, to return there. */
  detailFrom: Screen
  detailId: string | null
  matchTab: MatchTab
}

export type Action =
  | { type: 'GO'; screen: Screen }
  | { type: 'OPEN_DETAIL'; id: string }
  | { type: 'RATE'; id: string; rating: Rating; at: number }
  | { type: 'SET_AGE'; value: boolean }
  | { type: 'SET_ONBOARDED' }
  | { type: 'TOGGLE_DARK' }
  | { type: 'SET_MATCH_TAB'; tab: MatchTab }
  | { type: 'RESTART_DECK' }
  | { type: 'RESET' }

export function newBuddyNo(): number {
  return 100 + Math.floor(Math.random() * 9900)
}

export function initialProfile(): Profile {
  return { ratings: {}, ageConfirmed: false, onboarded: false, dark: false, buddyNo: newBuddyNo() }
}

export function initialState(profile: Profile = initialProfile()): AppState {
  return {
    profile,
    screen: 'welcome',
    prevScreen: 'welcome',
    detailFrom: 'swipe',
    detailId: null,
    matchTab: 'biere',
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
    case 'RATE':
      return {
        ...state,
        profile: {
          ...state.profile,
          ratings: { ...state.profile.ratings, [action.id]: { rating: action.rating, at: action.at } },
        },
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
      return { ...state, profile: { ...state.profile, ratings: {} } }
    case 'RESET':
      return initialState({ ...initialProfile(), dark: state.profile.dark })
  }
}
