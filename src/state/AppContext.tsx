/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { initialState, reducer } from './reducer'
import type { Action, AppState, Screen } from './reducer'
import type { Rating } from '../domain/types'

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
  rate: (id: string, rating: Rating) => void
  /** Global toast shown at the top of the shell. */
  toast: (text: string, color?: string) => void
  globalToast: ToastMsg | null
}

const Ctx = createContext<AppApi | null>(null)

/** Dev only: `?screen=howto` jumps straight to a screen. Stripped from production builds. */
function devInitialState(): AppState | null {
  if (!import.meta.env.DEV) return null
  const screen = new URLSearchParams(window.location.search).get('screen') as Screen | null
  if (!screen) return null
  const s = initialState()
  return { ...s, screen, profile: { ...s.profile, ageConfirmed: screen !== 'howto' } }
}

export const TOAST_MS = 2400

export function AppProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial, (i) => i ?? devInitialState() ?? initialState())
  const [globalToast, setGlobalToast] = useState<ToastMsg | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const toast = useCallback((text: string, color?: string) => {
    clearTimeout(timer.current)
    setGlobalToast({ text, color, key: Date.now() })
    timer.current = setTimeout(() => setGlobalToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

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
      rate: (id, rating) => dispatch({ type: 'RATE', id, rating, at: Date.now() }),
      toast,
      globalToast,
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
