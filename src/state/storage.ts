import { progressOf, unlockedIds } from '../domain/achievements'
import { RATINGS } from '../domain/types'
import type { Rating, Ratings } from '../domain/types'
import { initialProfile } from './reducer'
import type { Profile } from './reducer'

/**
 * Local persistence. The MVP keeps the whole profile in localStorage under a
 * versioned key; a backend can later replace `load`/`save` without touching the UI.
 */
export const STORAGE_KEY = 'pilsbuddy.profile'
export const SCHEMA_VERSION = 1

interface Envelope {
  v: number
  profile: Profile
}

export interface ProfileStore {
  load: () => Profile | null
  save: (p: Profile) => void
  clear: () => void
}

const isRating = (v: unknown): v is Rating => typeof v === 'string' && (RATINGS as readonly string[]).includes(v)

function sanitizeRatings(raw: unknown): Ratings {
  const out: Ratings = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [id, e] of Object.entries(raw as Record<string, unknown>)) {
    if (!e || typeof e !== 'object') continue
    const { rating, at, previous } = e as { rating?: unknown; at?: unknown; previous?: unknown }
    if (isRating(rating)) {
      out[id] = { rating, at: typeof at === 'number' ? at : 0 }
      if (isRating(previous) && previous !== rating) out[id].previous = previous
    }
  }
  return out
}

/** Accepts whatever is on disk and returns a valid Profile – or null if unusable. */
export function parseProfile(json: string | null): Profile | null {
  if (!json) return null
  try {
    const env = JSON.parse(json) as Partial<Envelope>
    if (!env || typeof env !== 'object' || !env.profile || typeof env.profile !== 'object') return null
    const p = env.profile as Partial<Profile>
    const base = initialProfile()
    const ratings = sanitizeRatings(p.ratings)
    return {
      ratings,
      ageConfirmed: p.ageConfirmed === true,
      onboarded: p.onboarded === true,
      dark: p.dark === true,
      buddyNo: typeof p.buddyNo === 'number' ? p.buddyNo : base.buddyNo,
      // Profiles from before moments existed: everything already unlocked counts as seen,
      // so nobody gets a burst of old overlays after an update.
      seen: Array.isArray(p.seen) ? p.seen.filter((x): x is string => typeof x === 'string') : unlockedIds(progressOf(ratings)),
    }
  } catch {
    return null
  }
}

export function serializeProfile(p: Profile): string {
  return JSON.stringify({ v: SCHEMA_VERSION, profile: p } satisfies Envelope)
}

export function createLocalStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null): ProfileStore {
  return {
    load: () => {
      try {
        return parseProfile(storage?.getItem(STORAGE_KEY) ?? null)
      } catch {
        return null
      }
    },
    save: (p) => {
      try {
        storage?.setItem(STORAGE_KEY, serializeProfile(p))
      } catch {
        /* quota / private mode – the app keeps working in memory */
      }
    },
    clear: () => {
      try {
        storage?.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    },
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export const profileStore: ProfileStore = createLocalStore(safeLocalStorage())
