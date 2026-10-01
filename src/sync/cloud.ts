import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeDNA } from '../domain/dna'
import { archetypeFor } from '../domain/persona'
import type { Rating, Ratings } from '../domain/types'
import type { Profile } from '../state/reducer'
import { AUTH_STORAGE_KEY, SUPABASE_KEY, SUPABASE_URL, SYNC_ACCOUNT_KEY, SYNC_BASE_KEY } from './config'
import { normalizeCode } from './code'
import { mergeRatings } from './merge'
import type { RemoteRatings } from './merge'

/**
 * Network side of the device sync. Loaded lazily (dynamic import) only when sync is on, so the
 * app stays small and fully usable without the backend. localStorage remains the source of truth.
 */

let client: SupabaseClient | null = null

export function cloud(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_STORAGE_KEY, detectSessionInUrl: false },
  })
  return client
}

/** `gone`: the account was deleted (on another device) or its code no longer exists. */
export type SyncErrorKind = 'offline' | 'auth' | 'code' | 'server' | 'gone'

export class SyncError extends Error {
  readonly kind: SyncErrorKind
  constructor(kind: SyncErrorKind, message?: string) {
    super(message ?? kind)
    this.kind = kind
  }
}

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

/** True if this device is signed into the account that `code` belongs to. */
export async function signedInto(code: string): Promise<boolean> {
  const { data } = await cloud().auth.getSession()
  return !!data.session && readKey(SYNC_ACCOUNT_KEY) === code
}

/** The signed-in (anonymous) user id; signs in anonymously on first use. */
export async function ensureUser(): Promise<string> {
  if (offline()) throw new SyncError('offline')
  const { data } = await cloud().auth.getSession()
  if (data.session) return data.session.user.id
  const { data: signed, error } = await cloud().auth.signInAnonymously()
  if (error || !signed.user) throw new SyncError('auth', error?.message)
  return signed.user.id
}

/** A fresh Sync-Code for this account; the previous one stops working. */
export async function createSyncCode(): Promise<string> {
  await ensureUser()
  const { data, error } = await cloud().functions.invoke<{ code: string }>('sync-code', { body: { action: 'create' } })
  if (error || !data?.code) throw new SyncError('server', error?.message)
  writeKey(SYNC_ACCOUNT_KEY, data.code)
  return data.code
}

/** Moves this device into the account behind `code`. */
export async function joinWithCode(input: string): Promise<void> {
  if (offline()) throw new SyncError('offline')
  const code = normalizeCode(input)
  if (!code) throw new SyncError('code')
  const { data, error } = await cloud().functions.invoke<{ token_hash: string }>('sync-code', { body: { action: 'redeem', code } })
  if (error || !data?.token_hash) {
    const status = (error as { context?: { status?: number } } | null)?.context?.status
    throw new SyncError(status === 404 || status === 400 ? 'code' : 'server', error?.message)
  }
  await cloud().auth.signOut({ scope: 'local' })
  const { error: otpError } = await cloud().auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
  if (otpError) throw new SyncError('auth', otpError.message)
  writeBase({}) // a different account: nothing agreed yet
  writeKey(SYNC_ACCOUNT_KEY, code)
}

/**
 * B4 „Alles löschen“: deletes the account behind this device's session (or behind `code` if the
 * session is lost) with everything in it, then forgets it here. An account that is already gone
 * counts as success.
 */
export async function deleteAccount(code: string | null): Promise<void> {
  if (offline()) throw new SyncError('offline')
  const { data } = await cloud().auth.getSession()
  if (!data.session) {
    if (!code) return leave()
    try {
      await joinWithCode(code)
    } catch (e) {
      if (e instanceof SyncError && e.kind === 'code') return leave() // nothing left to delete
      throw e
    }
  }
  const { error } = await cloud().functions.invoke('sync-code', { body: { action: 'delete' } })
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    // 401 = token no longer valid; only fine if the user really doesn't exist any more
    const { data: still } = status === 401 ? await cloud().auth.getUser() : { data: { user: true } }
    if (still.user) throw new SyncError('server', error.message)
  }
  return leave()
}

/** Forget the session on this device (cloud data stays). */
export async function leave(): Promise<void> {
  writeBase({})
  writeKey(SYNC_ACCOUNT_KEY, null)
  await cloud().auth.signOut({ scope: 'local' }).catch(() => undefined)
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeKey(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

export function readBase(): Ratings {
  try {
    const raw = localStorage.getItem(SYNC_BASE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Ratings) : {}
  } catch {
    return {}
  }
}

function writeBase(base: Ratings): void {
  try {
    localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(base))
  } catch {
    /* private mode – next sync just merges again */
  }
}

interface RatingRow {
  beer_id: string
  rating: Rating
  previous: Rating | null
  at: string
  deleted: boolean
}

interface ProfileRow {
  buddy_no: number
  dark: boolean
  onboarded: boolean
}

export interface SyncOutcome {
  ratings: Ratings
  /** The account's profile as stored in the cloud before this sync (null for a new account). */
  remoteProfile: Pick<Profile, 'buddyNo' | 'dark' | 'onboarded'> | null
}

/** Writing for a user that no longer exists (account deleted on another device, token still valid). */
const FK_VIOLATION = '23503'

/** One full sync: pull, three-way merge, push. Throws SyncError. */
export async function syncNow(profile: Profile): Promise<SyncOutcome> {
  const userId = await ensureUser()
  const db = cloud()
  const [ratingsRes, profileRes] = await Promise.all([
    db.from('ratings').select('beer_id, rating, previous, at, deleted').returns<RatingRow[]>(),
    db.from('profiles').select('buddy_no, dark, onboarded').eq('id', userId).maybeSingle<ProfileRow>(),
  ])
  if (ratingsRes.error || profileRes.error) throw new SyncError('server', (ratingsRes.error ?? profileRes.error)?.message)

  const remote: RemoteRatings = {}
  for (const r of ratingsRes.data ?? []) {
    remote[r.beer_id] = { rating: r.rating, at: Date.parse(r.at), deleted: r.deleted, ...(r.previous ? { previous: r.previous } : {}) }
  }
  const now = Date.now()
  const merged = mergeRatings(profile.ratings, remote, readBase(), now)

  const rows = [
    ...Object.entries(merged.upsert).map(([beer_id, e]) => ({
      user_id: userId,
      beer_id,
      rating: e.rating,
      previous: e.previous ?? null,
      at: new Date(e.at).toISOString(),
      deleted: false,
    })),
    ...merged.remove.map((beer_id) => ({
      user_id: userId,
      beer_id,
      rating: remote[beer_id].rating,
      previous: remote[beer_id].previous ?? null,
      at: new Date(now).toISOString(),
      deleted: true,
    })),
  ]
  if (rows.length) {
    const { error } = await db.from('ratings').upsert(rows)
    if (error) throw new SyncError(error.code === FK_VIOLATION ? 'gone' : 'server', error.message)
  }

  const p = profileRes.data
  const dna = computeDNA(merged.ratings)
  const { error: profileError } = await db.from('profiles').upsert({
    id: userId,
    // a joined device takes over the account's buddy number (see SYNC_APPLY adopt)
    buddy_no: p?.buddy_no ?? profile.buddyNo,
    archetype: archetypeFor(dna),
    taste: dna.taste,
    decoded: dna.decoded,
    dark: profile.dark,
    onboarded: profile.onboarded || (p?.onboarded ?? false),
  })
  if (profileError) throw new SyncError(profileError.code === FK_VIOLATION ? 'gone' : 'server', profileError.message)

  writeBase(merged.base)
  return {
    ratings: merged.ratings,
    remoteProfile: p ? { buddyNo: p.buddy_no, dark: p.dark, onboarded: p.onboarded } : null,
  }
}
