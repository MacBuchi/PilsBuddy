/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { newlyUnlocked, progressOf } from '../domain/achievements'
import type { AchievementDef } from '../domain/achievements'
import { countRatings } from '../domain/dna'
import type { Rating } from '../domain/types'
import { initialState, reducer, TAB_SCREENS } from './reducer'
import type { Action, AppState, Screen } from './reducer'
import { profileStore } from './storage'
import type { ProfileStore } from './storage'

export interface ToastMsg {
  text: string
  /** Border colour – the action colour for rating toasts, gold otherwise. */
  color?: string
  key: number
}

interface AppApi {
  state: AppState
  dispatch: (a: Action) => void
  go: (screen: Screen) => void
  openDetail: (id: string) => void
  /** Rates a beer; shows the achievement toast if one unlocks and returns what unlocked. */
  rate: (id: string, rating: Rating) => AchievementDef[]
  /** Global toast shown at the top of the shell. */
  toast: (text: string, color?: string) => void
  globalToast: ToastMsg | null
  /** Bottom tab bar visible on this screen. */
  withTabs: boolean
}

const Ctx = createContext<AppApi | null>(null)

export const TOAST_MS = 2400

/** Dev only: `?screen=howto` jumps straight to a screen. Stripped from production builds. */
function devInitialState(): AppState | null {
  if (!import.meta.env.DEV) return null
  const params = new URLSearchParams(window.location.search)
  const screen = params.get('screen') as Screen | null
  if (!screen) return null
  const s = initialState()
  const demo = params.has('demo')
  const ratings = demo
    ? Object.fromEntries(
        Object.entries(DEMO_RATINGS).map(([id, rating], i) => [id, { rating, at: 1_700_000_000_000 + i * 60_000 }]),
      )
    : {}
  return { ...s, screen, profile: { ...s.profile, ratings, ageConfirmed: screen !== 'howto', onboarded: demo } }
}

const DEMO_RATINGS: Record<string, Rating> = {
  jever: 'LIKE',
  augustiner: 'KNOW',
  becks: 'DISLIKE',
  schlenkerla: 'UNKNOWN',
  rothaus: 'LIKE',
  krombacher: 'DISLIKE',
  ratsherrn: 'WANT_TO_TRY',
  tegernseer: 'KNOW',
  astra: 'LIKE',
  flensburger: 'LIKE',
}

/** Resume where the user left off: a returning user with a confirmed age lands on the deck. */
export function bootState(store: ProfileStore): AppState {
  const saved = store.load()
  if (!saved) return initialState()
  const resume = saved.ageConfirmed && (saved.onboarded || countRatings(saved.ratings).total > 0)
  const s = initialState(saved)
  return resume ? { ...s, screen: 'swipe', prevScreen: 'swipe' } : s
}

export function AppProvider({ children, initial, store = profileStore }: { children: ReactNode; initial?: AppState; store?: ProfileStore }) {
  const [state, dispatch] = useReducer(reducer, initial, (i) => i ?? devInitialState() ?? bootState(store))
  const [globalToast, setGlobalToast] = useState<ToastMsg | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const toast = useCallback((text: string, color?: string) => {
    clearTimeout(timer.current)
    setGlobalToast({ text, color, key: Date.now() })
    timer.current = setTimeout(() => setGlobalToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  // Persist every profile change (ratings, flags, theme). Navigation is deliberately not saved.
  useEffect(() => {
    store.save(state.profile)
  }, [state.profile, store])

  // Theme: the whole document follows the profile, so the page background outside the shell matches.
  useEffect(() => {
    document.documentElement.dataset.theme = state.profile.dark ? 'dark' : 'light'
  }, [state.profile.dark])

  const api = useMemo<AppApi>(
    () => ({
      state,
      dispatch,
      go: (screen) => dispatch({ type: 'GO', screen }),
      openDetail: (id) => dispatch({ type: 'OPEN_DETAIL', id }),
      rate: (id, rating) => {
        const before = state.profile.ratings
        const old = before[id]
        const next = { ...before, [id]: { rating, at: 0, previous: old && old.rating !== rating ? old.rating : old?.previous } }
        dispatch({ type: 'RATE', id, rating, at: Date.now() })
        const unlocked = newlyUnlocked(progressOf(before), progressOf(next))
        // big achievements get a full-screen moment (MomentHost), the small ones a toast
        const small = unlocked.find((a) => !a.moment)
        if (small) toast(`🏅 ${small.title} – ${small.desc}`)
        return unlocked
      },
      toast,
      globalToast,
      withTabs: state.profile.onboarded && (TAB_SCREENS as readonly string[]).includes(state.screen),
    }),
    [state, toast, globalToast],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useApp(): AppApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}
