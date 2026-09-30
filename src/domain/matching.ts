import { BEER_BY_ID, DECK_ORDER } from '../data/beers'
import { COPY, fill } from '../data/copy'
import { TASTE_AXES } from './types'
import type { Beer, Ratings, TasteVector } from './types'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/**
 * Beer ↔ user compatibility as a playful percentage (48–99).
 * Mean absolute distance over all axes, mapped 104 − d × 150. Reproducible by construction.
 */
export function compatibility(user: TasteVector, beer: TasteVector): number {
  let diff = 0
  for (const a of TASTE_AXES) diff += Math.abs(user[a] - beer[a]) / 100
  diff /= TASTE_AXES.length
  return Math.round(clamp(104 - diff * 150, 48, 99))
}

export interface Candidate {
  beer: Beer
  pct: number
}

/**
 * Beers to recommend, best first. Prefers beers the user has not dated yet;
 * once the deck is empty, falls back to the WANT_TO_TRY/UNKNOWN pile, then everything.
 */
export function rankCandidates(user: TasteVector, ratings: Ratings, order = DECK_ORDER, lookup = BEER_BY_ID): Candidate[] {
  let ids = order.filter((id) => !ratings[id])
  if (!ids.length) ids = order.filter((id) => ['WANT_TO_TRY', 'UNKNOWN'].includes(ratings[id].rating))
  if (!ids.length) ids = [...order]
  return ids
    .map((id) => ({ beer: lookup[id], pct: compatibility(user, lookup[id].taste) }))
    .sort((a, b) => b.pct - a.pct || a.beer.name.localeCompare(b.beer.name))
}

/** "Du hast eine verdächtig hohe Affinität zu herbem, trockenem Bier." */
export function matchReason(user: TasteVector, beer: Beer): string {
  const axes = TASTE_AXES.filter((a) => user[a] > 55 && beer.taste[a] > 60)
    .sort((x, y) => user[y] * beer.taste[y] - user[x] * beer.taste[x])
    .slice(0, 2)
  if (!axes.length) return COPY.match.fallbackReason
  return fill(COPY.match.reason, { adj: axes.map((a) => COPY.axisAdjectives[a]).join(', ') })
}

/** Minimum axis gap (points) worth mentioning in "Warum passt es zu dir?". */
export const WHY_MIN_GAP = 15

/**
 * "Warum passt es zu dir?" – the shared strengths plus the two biggest differences, as sentences.
 * Deterministic; the optional AI layer (Stufe D) may later rephrase, never replace, this.
 */
export function whyItFits(user: TasteVector, beer: Beer): string[] {
  const gaps = TASTE_AXES.map((axis) => ({ axis, d: beer.taste[axis] - user[axis] }))
    .filter((g) => Math.abs(g.d) >= WHY_MIN_GAP)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d) || TASTE_AXES.indexOf(a.axis) - TASTE_AXES.indexOf(b.axis))
    .slice(0, 2)
  const lines = [matchReason(user, beer)]
  if (!gaps.length) lines.push(COPY.why.close)
  for (const g of gaps) {
    lines.push(fill(g.d > 0 ? COPY.why.more : COPY.why.less, { axis: COPY.why.axisNames[g.axis], n: Math.round(Math.abs(g.d)) }))
  }
  return lines
}

/* ---------- Social matching (prepared, not yet exposed in the UI) ---------- */

/** Cosine similarity of two taste vectors, 0–1. */
export function tasteSimilarity(a: TasteVector, b: TasteVector): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (const k of TASTE_AXES) {
    dot += a[k] * b[k]
    na += a[k] * a[k]
    nb += b[k] * b[k]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export interface BuddyMatch {
  /** 0–100 */
  pct: number
  /** Beer ids both users liked. */
  shared: string[]
  /** Beer ids where one liked and the other disliked. */
  disagree: string[]
}

/** User ↔ user Pils-Match: taste-vector similarity plus overlap of liked beers. */
export function buddyMatch(a: { taste: TasteVector; ratings: Ratings }, b: { taste: TasteVector; ratings: Ratings }): BuddyMatch {
  const shared: string[] = []
  const disagree: string[] = []
  for (const id in a.ratings) {
    const ra = a.ratings[id].rating
    const rb = b.ratings[id]?.rating
    if (!rb) continue
    if (ra === 'LIKE' && rb === 'LIKE') shared.push(id)
    if ((ra === 'LIKE' && rb === 'DISLIKE') || (ra === 'DISLIKE' && rb === 'LIKE')) disagree.push(id)
  }
  const overlap = shared.length + disagree.length
  const agreement = overlap ? shared.length / overlap : 0.5
  const pct = Math.round(clamp((tasteSimilarity(a.taste, b.taste) * 0.7 + agreement * 0.3) * 100, 0, 99))
  return { pct, shared, disagree }
}
