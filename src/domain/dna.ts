import { BEER_BY_ID } from '../data/beers'
import { COPY } from '../data/copy'
import { TASTE_AXES } from './types'
import type { BeerDNA, Rating, RatingCounts, Ratings, TasteAxis, TasteVector } from './types'

/** Ratings needed for a "100 % decoded" profile. Matches the design (14 of 15 reference beers). */
export const DECODE_TARGET = 14

/**
 * Influence of each rating on the taste vector (Designsystem §7).
 * UNKNOWN is 0 on purpose: not knowing a beer says nothing about taste.
 * WANT_TO_TRY counts as interest, not as a confirmed preference.
 */
export const RATING_WEIGHT: Record<Rating, number> = {
  LIKE: 1,
  WANT_TO_TRY: 0.6,
  KNOW: 0.2,
  DISLIKE: -0.8,
  UNKNOWN: 0,
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function countRatings(ratings: Ratings): RatingCounts {
  const c: RatingCounts = { LIKE: 0, DISLIKE: 0, KNOW: 0, UNKNOWN: 0, WANT_TO_TRY: 0, total: 0 }
  for (const id in ratings) {
    c[ratings[id].rating]++
    c.total++
  }
  return c
}

/** 0–100, how complete the profile is. Purely count-based so it is easy to explain. */
export function decodedPercent(total: number): number {
  return Math.min(100, Math.round((total / DECODE_TARGET) * 100))
}

export const NEUTRAL_VECTOR: TasteVector = Object.fromEntries(TASTE_AXES.map((a) => [a, 50])) as TasteVector

/**
 * Taste vector from ratings, one axis at a time:
 *   v = weighted mean of positively rated beers (LIKE, WANT_TO_TRY, KNOW)
 *   v -= 0.4 × (mean of disliked beers − 0.5)     → dislikes push away from what they are
 *   v = 0.5 + (v − 0.5) × 1.7                      → spread so profiles look distinct
 * Result per axis is clamped to 6–97. With no data every axis is 50.
 */
export function computeTasteVector(ratings: Ratings, lookup = BEER_BY_ID): TasteVector {
  const out = { ...NEUTRAL_VECTOR }
  for (const axis of TASTE_AXES) {
    let ps = 0
    let pw = 0
    let ns = 0
    let nw = 0
    for (const id in ratings) {
      const beer = lookup[id]
      if (!beer) continue
      const w = RATING_WEIGHT[ratings[id].rating]
      const v = beer.taste[axis] / 100
      if (w > 0) {
        ps += w * v
        pw += w
      } else if (w < 0) {
        ns += -w * v
        nw += -w
      }
    }
    let v = pw ? ps / pw : 0.5
    if (nw) v -= (ns / nw - 0.5) * 0.4
    v = clamp(0.5 + (v - 0.5) * 1.7, 0.06, 0.97)
    out[axis] = Math.round(v * 100)
  }
  return out
}

/** Interest signal 0–100 from WANT_TO_TRY and UNKNOWN. Never influenced by dislikes. */
export function computeCuriosity(c: RatingCounts): number {
  if (!c.total) return 0
  const v = clamp(0.12 + ((c.WANT_TO_TRY + c.UNKNOWN * 0.7) / c.total) * 1.4, 0.05, 0.97)
  return Math.round(v * 100)
}

export function computeDNA(ratings: Ratings, lookup = BEER_BY_ID): BeerDNA {
  const counts = countRatings(ratings)
  return {
    taste: computeTasteVector(ratings, lookup),
    curiosity: computeCuriosity(counts),
    decoded: decodedPercent(counts.total),
    counts,
  }
}

/** The five axes shown as bars on the DNA screen, in display order (Designsystem §4c). */
export const DISPLAY_AXES: { axis: TasteAxis; label: string; color: string }[] = [
  { axis: 'bitterness', label: COPY.dnaAxes.bitterness, color: '#5FB25A' },
  { axis: 'hopIntensity', label: COPY.dnaAxes.hopIntensity, color: '#8DB23A' },
  { axis: 'maltiness', label: COPY.dnaAxes.maltiness, color: '#C98A3C' },
  { axis: 'drinkability', label: COPY.dnaAxes.drinkability, color: '#4C9FD6' },
  { axis: 'character', label: COPY.dnaAxes.character, color: '#E5534B' },
]

/** Index into DISPLAY_AXES of the user's strongest visible axis. */
export function dominantDisplayAxis(t: TasteVector): number {
  let best = 0
  DISPLAY_AXES.forEach((a, i) => {
    if (t[a.axis] > t[DISPLAY_AXES[best].axis]) best = i
  })
  return best
}
