import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Action, Profile } from '../state/reducer'
import { normalizeCode } from './code'

/**
 * Background device sync (Stufe B2). Opt-in via profile.sync.on; runs on start, a moment after
 * every change, when the device comes back online and when the app goes to the background.
 * Errors never block the app – the status line in the profile tells what happened.
 */

export type SyncState = 'off' | 'syncing' | 'ok' | 'offline' | 'error'
export interface SyncStatus {
  state: SyncState
  lastAt: number | null
}

let status: SyncStatus = { state: 'off', lastAt: null }
const listeners = new Set<() => void>()
function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

const loadCloud = () => import('./cloud')
const DEBOUNCE_MS = 1500

/** Set after joining an account: the next sync adopts the account's buddy number. */
let adoptNext = false

async function runSync(profile: Profile, dispatch: (a: Action) => void): Promise<void> {
  setStatus({ state: 'syncing' })
  try {
    const c = await loadCloud() // may fail offline before the chunk was ever cached
    // site data cleared or profile imported on a new device: rejoin the account behind the code
    if (profile.sync.code && !(await c.signedInto(profile.sync.code))) {
      await c.joinWithCode(profile.sync.code)
      adoptNext = true
    }
    const sent = profile.ratings
    const out = await c.syncNow(profile)
    const adopt =
      adoptNext && out.remoteProfile
        ? { buddyNo: out.remoteProfile.buddyNo, onboarded: profile.onboarded || out.remoteProfile.onboarded }
        : undefined
    adoptNext = false
    dispatch({ type: 'SYNC_APPLY', sent, result: out.ratings, adopt })
    if (!profile.sync.code) dispatch({ type: 'SET_SYNC', sync: { code: await c.createSyncCode() } })
    setStatus({ state: 'ok', lastAt: Date.now() })
  } catch (e) {
    const kind = (e as { kind?: string }).kind
    setStatus({ state: kind === 'offline' || navigator.onLine === false ? 'offline' : 'error' })
  }
}

export function useCloudSync(profile: Profile, dispatch: (a: Action) => void): void {
  const latest = useRef(profile)
  const running = useRef<Promise<void> | null>(null)
  const again = useRef(false)

  useEffect(() => {
    latest.current = profile
  })

  const { on } = profile.sync
  const changeKey = on ? JSON.stringify([profile.ratings, profile.dark, profile.onboarded, profile.sync.code]) : ''

  useEffect(() => {
    if (!on) {
      setStatus({ state: 'off' })
      return
    }
    const kick = () => {
      if (running.current) {
        again.current = true
        return
      }
      running.current = runSync(latest.current, dispatch).finally(() => {
        running.current = null
        if (again.current) {
          again.current = false
          kick()
        }
      })
    }
    const t = setTimeout(kick, DEBOUNCE_MS)
    const onHidden = () => document.visibilityState === 'hidden' && kick()
    window.addEventListener('online', kick)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      clearTimeout(t)
      window.removeEventListener('online', kick)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [on, changeKey, dispatch])
}

/** UI actions; each throws a SyncError-like { kind } on failure. */
export const syncActions = {
  enable(dispatch: (a: Action) => void) {
    dispatch({ type: 'SET_SYNC', sync: { on: true } })
  },
  disable(dispatch: (a: Action) => void) {
    dispatch({ type: 'SET_SYNC', sync: { on: false } })
  },
  async join(input: string, dispatch: (a: Action) => void): Promise<void> {
    const code = normalizeCode(input)
    if (!code) throw Object.assign(new Error('format'), { kind: 'code' })
    const c = await loadCloud()
    await c.joinWithCode(code)
    adoptNext = true
    dispatch({ type: 'SET_SYNC', sync: { on: true, code } })
  },
  async renew(dispatch: (a: Action) => void): Promise<void> {
    const c = await loadCloud()
    dispatch({ type: 'SET_SYNC', sync: { code: await c.createSyncCode() } })
  },
  /** RESET: forget the account on this device. */
  async forget(): Promise<void> {
    const c = await loadCloud()
    await c.leave()
    setStatus({ state: 'off', lastAt: null })
  },
}
