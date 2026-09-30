import { BEER_BY_ID } from '../data/beers'
import { COPY, fill, pick } from '../data/copy'
import { countRatings, decodedPercent } from './dna'
import type { ArchetypeId, Beer, Rating, Ratings } from './types'

/** Small stable hash so the same beer always gets the same line. */
export function hashId(id: string): number {
  let h = 7
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

export interface QuipContext {
  rating: Rating
  beer: Beer
  /** Ratings before this swipe. */
  before: Ratings
  archetype?: ArchetypeId
  lookup?: Readonly<Record<string, Beer>>
}

/** The n-th line (1-based) of a rating's bank – consecutive swipes walk through it, so no quick repeats. */
export function bankQuip(rating: Rating, n: number, name: string): string {
  const list = COPY.quips[rating]
  return fill(list[(Math.max(1, n) - 1) % list.length], { name })
}

/**
 * The one-liner shown after a swipe. Priority: DNA decoded › round-number milestones ›
 * "first of its kind" moments › five nopes › beer-specific roast › 50 % › persona line (every
 * 7th swipe) › the rating's quip bank. Deterministic for a given state.
 */
export function quipAfterRating({ rating, beer, before, archetype = 'logo', lookup = BEER_BY_ID }: QuipContext): string {
  const prevCounts = countRatings(before)
  const counts = countRatings({ ...before, [beer.id]: { rating, at: 0 } })
  const dec = decodedPercent(counts.total)
  const prev = decodedPercent(prevCounts.total)
  const isNew = !before[beer.id]
  const m = COPY.milestones
  const firstOf = (test: (b: Beer, r: Rating) => boolean) =>
    isNew && !Object.entries(before).some(([id, e]) => lookup[id] && test(lookup[id], e.rating))
  const weizen = (b: Beer) => b.style.includes('Weißbier')

  if (prev < 100 && dec >= 100) return m.decoded
  if (isNew && m.total[counts.total]) return m.total[counts.total]
  if (weizen(beer) && rating === 'LIKE' && firstOf((b, r) => weizen(b) && r === 'LIKE')) return m.firstWeizenLike
  if (weizen(beer) && rating === 'DISLIKE' && firstOf((b, r) => weizen(b) && r === 'DISLIKE')) return m.firstWeizenNope
  if (rating === 'DISLIKE' && beer.tags.includes('Kultstatus') && firstOf((b, r) => r === 'DISLIKE' && b.tags.includes('Kultstatus')))
    return m.firstCultNope
  if (rating === 'LIKE' && beer.tags.includes('alkoholfrei') && firstOf((b, r) => r === 'LIKE' && b.tags.includes('alkoholfrei')))
    return m.firstAlcFreeLike
  if (rating === 'DISLIKE' && counts.DISLIKE === 5 && prevCounts.DISLIKE === 4) return m.fiveNopes
  if (rating === 'DISLIKE' && beer.disLikeQuip && hashId(beer.id) % 3 !== 0) return beer.disLikeQuip
  if (prev < 50 && dec >= 50) return fill(m.half, { pct: dec })
  if (archetype !== 'logo' && counts.total % 7 === 0) return pick(COPY.quipsByArchetype[archetype], counts.total / 7)
  return bankQuip(rating, counts[rating], beer.name)
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
