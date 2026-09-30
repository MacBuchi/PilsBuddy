import { COPY, fill, pick } from '../data/copy'
import { decodedPercent } from './dna'
import type { Beer, Rating, RatingCounts } from './types'

/** Small stable hash so the same beer always gets the same line. */
export function hashId(id: string): number {
  let h = 7
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * The one-liner shown after a swipe. Milestones win over beer-specific roasts,
 * which win over the generic quip bank. Deterministic for a given state.
 */
export function quipAfterRating(rating: Rating, beer: Beer, counts: RatingCounts, prevTotal: number): string {
  const dec = decodedPercent(counts.total)
  const prev = decodedPercent(prevTotal)
  if (prev < 100 && dec >= 100) return COPY.milestones.decoded
  if (rating === 'DISLIKE' && counts.DISLIKE === 5) return COPY.milestones.fiveNopes
  if (rating === 'DISLIKE' && beer.disLikeQuip && hashId(beer.id) % 3 !== 0) return beer.disLikeQuip
  if (prev < 50 && dec >= 50) return fill(COPY.milestones.half, { pct: dec })
  return fill(pick(COPY.quips[rating], hashId(beer.id) + counts.total), { name: beer.name })
}

/** Line under the relation chips on the detail screen. */
export function relationQuip(rating: Rating | undefined, beer: Beer): string {
  switch (rating) {
    case undefined:
      return COPY.detail.relNone
    case 'DISLIKE':
      return beer.disLikeQuip ?? COPY.detail.relNope
    case 'LIKE':
      return COPY.detail.relLike
    case 'WANT_TO_TRY':
      return COPY.detail.relTry
    case 'KNOW':
      return COPY.detail.relKnow
    case 'UNKNOWN':
      return COPY.detail.relUnknown
  }
}

export function progressMessage(decoded: number): string {
  if (decoded >= 100) return COPY.progress.full
  if (decoded >= 70) return COPY.progress.almost
  if (decoded >= 45) return fill(COPY.progress.half, { pct: decoded })
  if (decoded >= 20) return COPY.progress.some
  return COPY.progress.none
}
