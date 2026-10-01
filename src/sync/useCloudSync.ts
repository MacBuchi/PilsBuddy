import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Action, Profile, SyncSettings } from '../state/reducer'
import { AUTH_STORAGE_KEY } from './config'
import { normalizeCode } from './code'

/**
 * Background device sync (Stufe B2). Opt-in via profile.sync.on; runs on start, a moment after
 * every change, when the device comes back online and when the app goes to the background.
 * Errors never block the app – the status line in the profile tells what happened.
 */

/** `gone`: the account was deleted on another device – sync switched itself off, local data stays. */
export type SyncState = 'off' | 'syncing' | 'ok' | 'offline' | 'error' | 'gone'
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
/** After a failed sync (server hiccup, cold function) try again by itself; offline waits for `online`. */
export const RETRY_MS = [3_000, 10_000, 30_000, 60_000]

/** Set after joining an account: the next sync adopts the account's buddy number. */
let adoptNext = false

/** Returns 'ok', 'offline', 'gone' or 'error' (only the latter is retried). */
async function runSync(profile: Profile, dispatch: (a: Action) => void): Promise<'ok' | 'offline' | 'error' | 'gone'> {
  setStatus({ state: 'syncing' })
  try {
    const c = await loadCloud() // may fail offline before the chunk was ever cached
    // site data cleared or profile imported on a new device: rejoin the account behind the code
    if (profile.sync.code && !(await c.signedInto(profile.sync.code))) {
      await c.joinWithCode(profile.sync.code).catch((e: { kind?: string }) => {
        throw e.kind === 'code' ? Object.assign(e, { kind: 'gone' }) : e // the code's account no longer exists
      })
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
    return 'ok'
  } catch (e) {
    const kind = (e as { kind?: string }).kind
    if (kind === 'gone') {
      const c = await loadCloud()
      await c.leave()
      dispatch({ type: 'SET_SYNC', sync: { on: false, code: null } })
      setStatus({ state: 'gone', lastAt: null })
      return 'gone'
    }
    const result = kind === 'offline' || navigator.onLine === false ? 'offline' : 'error'
    setStatus({ state: result })
    return result
  }
}

export function useCloudSync(profile: Profile, dispatch: (a: Action) => void): void {
  const latest = useRef(profile)
  const running = useRef<Promise<unknown> | null>(null)
  const again = useRef(false)
  const failures = useRef(0)
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    latest.current = profile
  })

  const { on } = profile.sync
  const changeKey = on ? JSON.stringify([profile.ratings, profile.dark, profile.onboarded, profile.sync.code]) : ''

  useEffect(() => {
    if (!on) {
      if (status.state !== 'gone') setStatus({ state: 'off' }) // keep telling why it switched off
      return
    }
    const kick = () => {
      clearTimeout(retry.current)
      if (running.current) {
        again.current = true
        return
      }
      running.current = runSync(latest.current, dispatch).then((result) => {
        running.current = null
        failures.current = result === 'error' ? failures.current + 1 : 0
        if (again.current) {
          again.current = false
          kick()
        } else if (result === 'error') {
          retry.current = setTimeout(kick, RETRY_MS[Math.min(failures.current, RETRY_MS.length) - 1])
        }
      })
    }
    const t = setTimeout(kick, DEBOUNCE_MS)
    const onHidden = () => document.visibilityState === 'hidden' && kick()
    window.addEventListener('online', kick)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      clearTimeout(t)
      clearTimeout(retry.current)
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
  /** Deletes the cloud account with all its data and switches sync off; local data stays. */
  async erase(code: string | null, dispatch: (a: Action) => void): Promise<void> {
    const c = await loadCloud()
    await c.deleteAccount(code)
    dispatch({ type: 'SET_SYNC', sync: { on: false, code: null } })
    setStatus({ state: 'off', lastAt: null })
  },
}

/** True if this device ever used the sync (switched on, holds a code or a stored session). */
export function hasCloudAccount(sync: SyncSettings): boolean {
  if (sync.on || sync.code) return true
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) !== null
  } catch {
    return false
  }
}
