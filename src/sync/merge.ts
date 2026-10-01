import type { RatingEntry, Ratings } from '../domain/types'

/** A rating row as the cloud has it; `deleted` rows are tombstones (undo, deck restart, …). */
export interface RemoteRating extends RatingEntry {
  deleted: boolean
}

export type RemoteRatings = Record<string, RemoteRating>

export interface MergeResult {
  /** The ratings this device should show after the sync. */
  ratings: Ratings
  /** Rows to write to the cloud (live entries). */
  upsert: Ratings
  /** Beer ids whose cloud row becomes a tombstone. */
  remove: string[]
  /** What both sides agree on once the writes went through – the next sync's base. */
  base: Ratings
}

const same = (a: RatingEntry | null, b: RatingEntry | null): boolean =>
  a === b || (!!a && !!b && a.rating === b.rating && a.at === b.at && (a.previous ?? null) === (b.previous ?? null))

const clean = (e: RatingEntry): RatingEntry => (e.previous ? { rating: e.rating, at: e.at, previous: e.previous } : { rating: e.rating, at: e.at })

/**
 * Three-way merge of this device's ratings with the cloud, per beer:
 * `base` is what both sides had after the last successful sync. Whoever changed since then wins;
 * if both changed, the newer timestamp wins (a local removal counts as happening `now`), ties go
 * to this device. Pure and deterministic – the network part lives in `cloud.ts`.
 */
export function mergeRatings(local: Ratings, remote: RemoteRatings, base: Ratings, now: number): MergeResult {
  const ratings: Ratings = {}
  const upsert: Ratings = {}
  const remove: string[] = []
  const ids = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base)])

  for (const id of [...ids].sort()) {
    const L = local[id] ?? null
    const row = remote[id]
    const R = row && !row.deleted ? clean(row) : null
    const B = base[id] ?? null

    let winner: RatingEntry | null
    if (same(L, R)) winner = L
    else if (same(L, B)) winner = R // only the cloud changed
    else if (same(R, B)) winner = L // only this device changed
    else {
      const tL = L ? L.at : now
      const tR = R ? R.at : (row?.at ?? 0)
      winner = tL >= tR ? L : R
    }

    if (winner) ratings[id] = clean(winner)
    if (!same(winner, R)) {
      if (winner) upsert[id] = clean(winner)
      else if (row && !row.deleted) remove.push(id)
    }
  }
  return { ratings, upsert, remove, base: { ...ratings } }
}
