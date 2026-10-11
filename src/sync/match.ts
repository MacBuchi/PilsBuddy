import { parseFeed } from '../domain/pilsMatch'
import type { MatchFeed } from '../domain/pilsMatch'
import type { Profile } from '../state/reducer'
import { cloud, ensureUser, joinWithCode, signedInto, SyncError, syncNow } from './cloud'
import type { SyncOutcome } from './cloud'

/**
 * Network side of Pils-Match (Stufe C2/C3), loaded lazily like cloud.ts. Visibility and handle live in the
 * account's profile row (the server is the truth – a second device sees the same), clinks and blocks in their
 * own tables (RLS: own rows only), the feed comes from the Edge Function `match-candidates`.
 */

const NOBODY: MatchFeed = { visible: false, handle: null, people: [] }
const UNIQUE = '23505'
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

/** The feed; without an account (never synced) nobody is visible. */
export async function loadFeed(): Promise<MatchFeed> {
  if (offline()) throw new SyncError('offline')
  const { data: session } = await cloud().auth.getSession()
  if (!session.session) return NOBODY
  const { data, error } = await cloud().functions.invoke('match-candidates', { body: {} })
  if (error) throw new SyncError('server', error.message)
  const feed = parseFeed(data)
  if (!feed) throw new SyncError('server', 'feed')
  return feed
}

/**
 * Opt-in: syncs first (the profile row with taste and the ratings others will compare with), then sets handle +
 * visible. Throws SyncError, kind `code` when the handle is taken. The caller applies the sync outcome.
 */
export async function becomeVisible(profile: Profile, handle: string): Promise<SyncOutcome> {
  if (offline()) throw new SyncError('offline')
  // this device belongs to an account it is no longer signed into – rejoin it instead of starting a new one
  if (profile.sync.code && !(await signedInto(profile.sync.code))) await joinWithCode(profile.sync.code)
  const outcome = await syncNow(profile)
  const userId = await ensureUser()
  const { error } = await cloud().from('profiles').update({ handle, visible: true }).eq('id', userId)
  if (error) throw new SyncError(error.code === UNIQUE ? 'code' : 'server', error.message)
  return outcome
}

/** Opt-out: the profile disappears from every feed; the handle stays reserved for a comeback. */
export async function becomeHidden(): Promise<void> {
  if (offline()) throw new SyncError('offline')
  const { data: session } = await cloud().auth.getSession()
  if (!session.session) return
  const { error } = await cloud().from('profiles').update({ visible: false }).eq('id', session.session.user.id)
  if (error) throw new SyncError('server', error.message)
}

export async function clink(to: string, on: boolean): Promise<void> {
  const from = await ensureUser()
  const { error } = on
    ? await cloud().from('match_clinks').upsert({ from_id: from, to_id: to }, { ignoreDuplicates: true })
    : await cloud().from('match_clinks').delete().eq('from_id', from).eq('to_id', to)
  if (error) throw new SyncError('server', error.message)
}

/** Blocking also takes back the own clink; the feed hides both people from each other. */
export async function block(to: string): Promise<void> {
  const from = await ensureUser()
  const { error } = await cloud().from('match_blocks').upsert({ from_id: from, to_id: to }, { ignoreDuplicates: true })
  if (error) throw new SyncError('server', error.message)
  await cloud().from('match_clinks').delete().eq('from_id', from).eq('to_id', to)
}
