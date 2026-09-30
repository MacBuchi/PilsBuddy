import type { Rating, RatingCounts, Ratings } from './types'

/** Ratings needed for a "100 % decoded" profile. Matches the design (14 of 15 reference beers). */
export const DECODE_TARGET = 14

export function countRatings(ratings: Ratings): RatingCounts {
  const c: RatingCounts = { LIKE: 0, DISLIKE: 0, KNOW: 0, UNKNOWN: 0, WANT_TO_TRY: 0, total: 0 }
  for (const id in ratings) {
    c[ratings[id].rating as Rating]++
    c.total++
  }
  return c
}

/** 0–100, how complete the profile is. Purely count-based so it is easy to explain. */
export function decodedPercent(total: number): number {
  return Math.min(100, Math.round((total / DECODE_TARGET) * 100))
}
