import { BEER_BY_ID } from '../data/beers'
import { computeDNA } from './dna'
import { buddyMatch } from './matching'
import type { BuddyMatch } from './matching'
import { archetypeFor } from './persona'
import type { ArchetypeId, Beer, BeerDNA, Rating, Ratings } from './types'

/**
 * Buddy link (Stufe C1, no backend): `?buddy=<base64url>` carries a buddy number and the ratings –
 * nothing else, no name, no timestamps. Taste, persona and avatar are recomputed by the receiver.
 */
export interface BuddySnapshot {
  no: number
  ratings: Ratings
}

const CODE: Record<Rating, string> = { LIKE: 'L', DISLIKE: 'D', WANT_TO_TRY: 'T', KNOW: 'K', UNKNOWN: 'U' }
const FROM_CODE = Object.fromEntries(Object.entries(CODE).map(([r, c]) => [c, r])) as Record<string, Rating>

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function encodeBuddy(no: number, ratings: Ratings): string {
  const groups: Record<string, string[]> = {}
  for (const id of Object.keys(ratings).sort()) {
    const c = CODE[ratings[id].rating]
    ;(groups[c] ??= []).push(id)
  }
  return toBase64Url(JSON.stringify({ v: 1, n: no, r: groups }))
}

/** Parses a link payload; unknown beers are dropped, anything malformed returns null. */
export function decodeBuddy(param: string | null, lookup: Readonly<Record<string, Beer>> = BEER_BY_ID): BuddySnapshot | null {
  if (!param || param.length > 8000) return null
  try {
    const raw = JSON.parse(fromBase64Url(param)) as { v?: unknown; n?: unknown; r?: unknown }
    if (raw.v !== 1 || typeof raw.n !== 'number' || !Number.isFinite(raw.n) || !raw.r || typeof raw.r !== 'object') return null
    const ratings: Ratings = {}
    for (const [c, ids] of Object.entries(raw.r as Record<string, unknown>)) {
      const rating = FROM_CODE[c]
      if (!rating || !Array.isArray(ids)) continue
      for (const id of ids) if (typeof id === 'string' && lookup[id]) ratings[id] = { rating, at: 0 }
    }
    return Object.keys(ratings).length ? { no: Math.round(raw.n), ratings } : null
  } catch {
    return null
  }
}


export interface BuddyComparison extends BuddyMatch {
  buddyDna: BeerDNA
  buddyArchetype: ArchetypeId
  /** Beers the buddy loves that I haven't really tried (unrated, Probierliste or unknown). */
  tips: string[]
}

export function compareWithBuddy(myRatings: Ratings, buddy: BuddySnapshot): BuddyComparison {
  const me = computeDNA(myRatings)
  const buddyDna = computeDNA(buddy.ratings)
  // only beers this catalogue knows (a link or a sync can carry ids from a newer/older catalogue)
  const known = (id: string) => !!BEER_BY_ID[id]
  const raw = buddyMatch({ taste: me.taste, ratings: myRatings }, { taste: buddyDna.taste, ratings: buddy.ratings })
  const match = { ...raw, shared: raw.shared.filter(known), disagree: raw.disagree.filter(known) }
  const tips = Object.keys(buddy.ratings)
    .filter(known)
    .filter((id) => buddy.ratings[id].rating === 'LIKE')
    .filter((id) => {
      const mine = myRatings[id]?.rating
      return !mine || mine === 'WANT_TO_TRY' || mine === 'UNKNOWN'
    })
    .sort()
  return { ...match, buddyDna, buddyArchetype: archetypeFor(buddyDna), tips }
}
