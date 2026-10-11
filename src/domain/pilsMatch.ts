import { BEER_BY_ID } from '../data/beers'
import { compareWithBuddy } from './buddyLink'
import type { BuddyComparison } from './buddyLink'
import type { Beer, Rating, Ratings } from './types'

/**
 * Pils-Match (Stufe C2/C3): what the feed (Edge Function `match-candidates`) returns, checked and ranked.
 * The server only picks the people with the closest taste vector – match, persona, shared beers and tips are
 * computed here exactly as for a buddy link.
 */

/** Same rule as the column check `profiles.handle`. */
export const HANDLE = /^[A-Za-z0-9ÄÖÜäöüß_.-]{2,24}$/

/** The handle as it will be stored, or null if it doesn't fit. */
export function cleanHandle(input: string): string | null {
  const h = input.trim().replace(/^@/, '')
  return HANDLE.test(h) ? h : null
}

export interface MatchPerson {
  id: string
  handle: string
  ratings: Ratings
  /** I clinked this person. */
  mine: boolean
  /** Clinked in both directions – buddies. */
  mutual: boolean
}

export interface MatchFeed {
  visible: boolean
  handle: string | null
  people: MatchPerson[]
}

const FROM_CODE: Record<string, Rating> = { L: 'LIKE', D: 'DISLIKE', T: 'WANT_TO_TRY', K: 'KNOW' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Checks the function's answer; unknown beers and malformed people are dropped, a broken answer gives null. */
export function parseFeed(raw: unknown, lookup: Readonly<Record<string, Beer>> = BEER_BY_ID): MatchFeed | null {
  if (!raw || typeof raw !== 'object') return null
  const { me, people } = raw as { me?: { visible?: unknown; handle?: unknown }; people?: unknown }
  if (!me || typeof me !== 'object' || !Array.isArray(people)) return null
  const handle = typeof me.handle === 'string' && HANDLE.test(me.handle) ? me.handle : null
  const out: MatchPerson[] = []
  for (const p of people as Record<string, unknown>[]) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !UUID.test(p.id)) continue
    if (typeof p.handle !== 'string' || !HANDLE.test(p.handle)) continue
    const ratings: Ratings = {}
    if (p.ratings && typeof p.ratings === 'object') {
      for (const [code, ids] of Object.entries(p.ratings as Record<string, unknown>)) {
        const rating = FROM_CODE[code]
        if (!rating || !Array.isArray(ids)) continue
        for (const id of ids) if (typeof id === 'string' && lookup[id]) ratings[id] = { rating, at: 0 }
      }
    }
    out.push({ id: p.id, handle: p.handle, ratings, mine: p.mine === true, mutual: p.mine === true && p.mutual === true })
  }
  return { visible: me.visible === true && handle !== null, handle, people: out }
}

export interface RankedPerson extends MatchPerson {
  compare: BuddyComparison
}

/** Buddies first, then by match; ties by handle so the list doesn't jump. */
export function rankPeople(myRatings: Ratings, people: readonly MatchPerson[]): RankedPerson[] {
  return people
    .map((p) => ({ ...p, compare: compareWithBuddy(myRatings, { no: 0, ratings: p.ratings }) }))
    .sort((a, b) => Number(b.mutual) - Number(a.mutual) || b.compare.pct - a.compare.pct || a.handle.localeCompare(b.handle))
}
