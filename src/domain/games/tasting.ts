import type { Beer, Rating, TasteAxis } from '../types'

/**
 * Tasting-Abend (Stufe E6): the host pours a beer, everyone at the table rates the same glass –
 * stars plus three taste axes – and once all have rated (or the host calls it) everyone sees the
 * verdicts side by side. Several beers make an evening; the end ranks them. Only the host runs
 * these rules (see room.ts); guests render the host's snapshot. Pure and deterministic.
 */

/** The axes everyone judges – the ones you taste without a lab. */
export const TASTING_AXES = ['bitterness', 'body', 'sweetness'] as const satisfies readonly TasteAxis[]
export type TastingAxis = (typeof TASTING_AXES)[number]

/** Beers per evening – keeps the snapshot small and the evening finite. */
export const MAX_TASTING_BEERS = 12
const TEXT_MAX = 60
/** Stars this far apart at one table make a „Streitbier“. */
export const SPLIT_STARS = 2

/**
 * The beer in the glass, as the host's device knows it. Guests may not have it in their catalog
 * (database or regional beers, or one typed by hand), so the snapshot carries what they show.
 */
export interface TastingBeer {
  /** Catalog id on the host's device; '' for a beer typed by hand. */
  id: string
  name: string
  brewery: string
  style: string
  /** PilsBuddy's profile for the judged axes, if the beer has one. */
  taste: Record<TastingAxis, number> | null
  /** The profile is only a style estimate (Stufe R), not a tasting. */
  estimate: boolean
}

export interface TastingVerdict {
  /** 1–5 */
  stars: number
  /** 0–100 each */
  axes: Record<TastingAxis, number>
}

export interface TastingRound {
  beer: TastingBeer
  /** Verdicts by player id. */
  verdicts: Record<string, TastingVerdict>
  /** Everyone sees all verdicts. */
  revealed: boolean
}

export interface Tasting {
  kind: 'tasting'
  /** Every beer poured this evening; the last one is in the glass. Empty until the host pours. */
  rounds: TastingRound[]
  /** The host closed the evening. */
  over: boolean
}

export function newTasting(): Tasting {
  return { kind: 'tasting', rounds: [], over: false }
}

const clean = (s: string) =>
  // eslint-disable-next-line no-control-regex
  s.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, TEXT_MAX)

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)))

/** A catalog beer for the glass. */
export function tastingBeer(beer: Beer): TastingBeer {
  return {
    id: beer.id,
    name: clean(beer.name),
    brewery: clean(beer.brewery),
    style: clean(beer.style),
    taste: { bitterness: beer.taste.bitterness, body: beer.taste.body, sweetness: beer.taste.sweetness },
    estimate: !!beer.regional,
  }
}

/** A beer typed by hand – no profile to compare against. Null for an empty name. */
export function customBeer(name: string): TastingBeer | null {
  const n = clean(name)
  return n ? { id: '', name: n, brewery: '', style: '', taste: null, estimate: false } : null
}

export const currentRound = (t: Tasting): TastingRound | null => t.rounds[t.rounds.length - 1] ?? null

/** Pour the next beer: at the start or after a reveal, up to MAX_TASTING_BEERS. */
export function tastingPour(t: Tasting, beer: TastingBeer): Tasting {
  const cur = currentRound(t)
  if (t.over || (cur && !cur.revealed) || t.rounds.length >= MAX_TASTING_BEERS || !beer.name) return t
  return { ...t, rounds: [...t.rounds, { beer, verdicts: {}, revealed: false }] }
}

/** One verdict per player and beer, only before the reveal. Values are clamped, not refused. */
export function tastingRate(t: Tasting, from: string, verdict: TastingVerdict): Tasting {
  const cur = currentRound(t)
  if (t.over || !cur || cur.revealed || Object.hasOwn(cur.verdicts, from)) return t
  const v: TastingVerdict = {
    stars: clamp(verdict.stars, 1, 5),
    axes: { bitterness: 50, body: 50, sweetness: 50 },
  }
  for (const a of TASTING_AXES) v.axes[a] = clamp(verdict.axes[a], 0, 100)
  return withCurrent(t, { ...cur, verdicts: { ...cur.verdicts, [from]: v } })
}

/** Everyone sees the verdicts. Needs at least one. */
export function tastingReveal(t: Tasting): Tasting {
  const cur = currentRound(t)
  if (t.over || !cur || cur.revealed || !Object.keys(cur.verdicts).length) return t
  return withCurrent(t, { ...cur, revealed: true })
}

/** Reveals by itself once everyone at the table (`ids`) has rated. */
export function tastingSettle(t: Tasting, ids: readonly string[]): Tasting {
  const cur = currentRound(t)
  return cur && ids.length && ids.every((id) => Object.hasOwn(cur.verdicts, id)) ? tastingReveal(t) : t
}

/** The host closes the evening – after a reveal (a beer still being rated is dropped), never empty. */
export function tastingEnd(t: Tasting): Tasting {
  const cur = currentRound(t)
  if (t.over || !cur) return t
  if (cur.revealed) return { ...t, over: true }
  const rounds = t.rounds.slice(0, -1)
  return rounds.length ? { ...t, rounds, over: true } : t
}

function withCurrent(t: Tasting, round: TastingRound): Tasting {
  return { ...t, rounds: [...t.rounds.slice(0, -1), round] }
}

export interface TastingSummary {
  /** Average stars, one decimal. */
  stars: number
  /** Average of every axis, rounded. */
  axes: Record<TastingAxis, number>
  /** Fewest and most stars given. */
  low: number
  high: number
  count: number
  /** The table disagrees: stars SPLIT_STARS or more apart. */
  split: boolean
}

export function summarize(round: TastingRound): TastingSummary | null {
  const list = Object.values(round.verdicts)
  if (!list.length) return null
  const avg = (f: (v: TastingVerdict) => number) => list.reduce((s, v) => s + f(v), 0) / list.length
  const stars = list.map((v) => v.stars)
  const low = Math.min(...stars)
  const high = Math.max(...stars)
  return {
    stars: Math.round(avg((v) => v.stars) * 10) / 10,
    axes: {
      bitterness: Math.round(avg((v) => v.axes.bitterness)),
      body: Math.round(avg((v) => v.axes.body)),
      sweetness: Math.round(avg((v) => v.axes.sweetness)),
    },
    low,
    high,
    count: list.length,
    split: high - low >= SPLIT_STARS,
  }
}

/** The evening's beers, best first; equal averages share a place. Beers nobody rated are left out. */
export function tastingRanking(t: Tasting): { index: number; beer: TastingBeer; summary: TastingSummary; place: number }[] {
  const list = t.rounds
    .map((r, index) => ({ index, beer: r.beer, summary: summarize(r) }))
    .filter((e): e is { index: number; beer: TastingBeer; summary: TastingSummary } => e.summary !== null)
    .sort((a, b) => b.summary.stars - a.summary.stars || a.index - b.index)
  return list.map((e) => ({ ...e, place: list.findIndex((o) => o.summary.stars === e.summary.stars) + 1 }))
}

/** The beer the table disagreed on most (widest star spread, at least SPLIT_STARS), or null. */
export function mostDisputed(t: Tasting): number | null {
  let best: number | null = null
  let spread = SPLIT_STARS - 1
  t.rounds.forEach((r, i) => {
    const s = summarize(r)
    if (s && s.high - s.low > spread) {
      spread = s.high - s.low
      best = i
    }
  })
  return best
}

/**
 * What a verdict means for the own ratings, if the player wants to keep it: 4–5 stars a like,
 * 1–2 a dislike, 3 stars says nothing either way.
 */
export function ratingFor(stars: number): Rating | null {
  return stars >= 4 ? 'LIKE' : stars <= 2 ? 'DISLIKE' : null
}

// ---- snapshots from the network -------------------------------------------------------------

const isScore = (n: unknown, lo: number, hi: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi

function parseAxes(raw: unknown): Record<TastingAxis, number> | null {
  const a = raw as Record<string, unknown> | null
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null
  const out = { bitterness: 0, body: 0, sweetness: 0 }
  for (const k of TASTING_AXES) {
    const v = a[k]
    if (!isScore(v, 0, 100)) return null
    out[k] = v
  }
  return out
}

function parseBeer(raw: unknown): TastingBeer | null {
  const b = raw as Partial<Record<keyof TastingBeer, unknown>> | null
  if (!b || typeof b !== 'object') return null
  const { id, name, brewery, style, estimate } = b
  if (typeof id !== 'string' || typeof name !== 'string' || typeof brewery !== 'string' || typeof style !== 'string') return null
  if (typeof estimate !== 'boolean') return null
  const taste = b.taste === null ? null : parseAxes(b.taste)
  if (b.taste !== null && !taste) return null
  const n = clean(name)
  return n ? { id: id.slice(0, 200), name: n, brewery: clean(brewery), style: clean(style), taste, estimate } : null
}

/** A tasting from another device, checked field by field; null if anything is off. */
export function parseTasting(raw: Record<string, unknown>): Tasting | null {
  const { rounds, over } = raw
  if (!Array.isArray(rounds) || rounds.length > MAX_TASTING_BEERS || typeof over !== 'boolean') return null
  const list: TastingRound[] = []
  for (const r of rounds as Partial<Record<keyof TastingRound, unknown>>[]) {
    if (!r || typeof r !== 'object' || typeof r.revealed !== 'boolean') return null
    const beer = parseBeer(r.beer)
    const v = r.verdicts
    if (!beer || !v || typeof v !== 'object' || Array.isArray(v)) return null
    const verdicts: Record<string, TastingVerdict> = {}
    for (const [id, raw] of Object.entries(v)) {
      const x = raw as Partial<TastingVerdict> | null
      const axes = x && typeof x === 'object' ? parseAxes(x.axes) : null
      if (!x || !isScore(x.stars, 1, 5) || !axes) return null
      verdicts[id] = { stars: x.stars, axes }
    }
    list.push({ beer, verdicts, revealed: r.revealed })
  }
  // only the last beer can still be open
  if (list.slice(0, -1).some((r) => !r.revealed)) return null
  // a closed evening has at least one beer, and every one resolved
  if (over && !list[list.length - 1]?.revealed) return null
  return { kind: 'tasting', rounds: list, over }
}
