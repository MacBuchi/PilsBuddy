import { seededRandom, shuffle } from './quartett'

/**
 * „Wie viel ist drin?“ (Stufe E2): a glass is filled to some height, the player guesses the
 * millilitres. The volume is the glass's inner profile turned around its axis (a solid of
 * revolution built from cone frustums), so a half-full tulip really holds less than half.
 * Pure and deterministic – the same seed pours the same glasses.
 */

export type GlassId = 'stange' | 'tulpe' | 'willi' | 'weizen' | 'mass'

/** A point of the inner profile: height above the inner bottom and inner radius, both in mm. */
export type ProfilePoint = readonly [height: number, radius: number]

export interface Glass {
  id: GlassId
  /** Volume at the Eichstrich, in ml. */
  nominal: number
  /** Inner profile from bottom to brim, heights ascending; radii are calibrated to `nominal`. */
  profile: readonly ProfilePoint[]
  /** Height of the Eichstrich in mm. */
  mark: number
  /** Stem below the bowl (tulip) in mm; 0 = the glass stands on its own thick bottom. */
  stem: number
  handle: boolean
}

/** Raw shapes, roughly traced from the real glasses; only the proportions matter. */
const RAW: readonly Glass[] = [
  { id: 'stange', nominal: 200, mark: 105, stem: 0, handle: false, profile: [[0, 24], [125, 25]] },
  {
    id: 'tulpe',
    nominal: 300,
    mark: 150,
    stem: 45,
    handle: false,
    profile: [[0, 8], [18, 24], [55, 34], [110, 31], [150, 26], [172, 29]],
  },
  {
    id: 'willi',
    nominal: 500,
    mark: 160,
    stem: 0,
    handle: false,
    profile: [[0, 26], [35, 31], [105, 38], [145, 34], [178, 36]],
  },
  {
    id: 'weizen',
    nominal: 500,
    mark: 225,
    stem: 0,
    handle: false,
    profile: [[0, 20], [70, 23], [130, 23], [190, 31], [228, 36], [250, 35]],
  },
  { id: 'mass', nominal: 1000, mark: 165, stem: 0, handle: true, profile: [[0, 45], [192, 47]] },
]

/** Volume in ml of a profile filled to `height` mm (1 ml = 1000 mm³). */
function rawVolume(profile: readonly ProfilePoint[], height: number): number {
  let mm3 = 0
  for (let i = 1; i < profile.length; i++) {
    const [h0, r0] = profile[i - 1]
    const [h1, r1] = profile[i]
    if (height <= h0) break
    const top = Math.min(height, h1)
    const rTop = r0 + ((r1 - r0) * (top - h0)) / (h1 - h0)
    const h = top - h0
    mm3 += (Math.PI * h * (r0 * r0 + r0 * rTop + rTop * rTop)) / 3
  }
  return mm3 / 1000
}

/** Scales the radii so the Eichstrich holds exactly the nominal volume (volume grows with r²). */
function calibrate(g: Glass): Glass {
  const k = Math.sqrt(g.nominal / rawVolume(g.profile, g.mark))
  return { ...g, profile: g.profile.map(([h, r]) => [h, r * k] as const) }
}

export const GLASSES: readonly Glass[] = RAW.map(calibrate)
export const GLASS_BY_ID = Object.fromEntries(GLASSES.map((g) => [g.id, g])) as Record<GlassId, Glass>

/** Height of the brim in mm. */
export const brimOf = (g: Glass): number => g.profile[g.profile.length - 1][0]

/** Inner radius in mm at `height` (clamped to the glass). */
export function radiusAt(g: Glass, height: number): number {
  const p = g.profile
  if (height <= p[0][0]) return p[0][1]
  for (let i = 1; i < p.length; i++) {
    const [h0, r0] = p[i - 1]
    const [h1, r1] = p[i]
    if (height <= h1) return r0 + ((r1 - r0) * (height - h0)) / (h1 - h0)
  }
  return p[p.length - 1][1]
}

/** Millilitres in the glass when filled to `height` mm. */
export const volumeAt = (g: Glass, height: number): number => rawVolume(g.profile, Math.max(0, height))

/** Millilitres up to the brim. */
export const capacityOf = (g: Glass): number => volumeAt(g, brimOf(g))

/** Fill height in mm for `ml` (inverse of volumeAt, by bisection; clamped to the brim). */
export function heightFor(g: Glass, ml: number): number {
  let lo = 0
  let hi = brimOf(g)
  if (ml >= capacityOf(g)) return hi
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (volumeAt(g, mid) < ml) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export interface FillRound {
  glass: GlassId
  /** What is really in the glass, in ml (a multiple of STEP_ML). */
  ml: number
}

export interface FillGame {
  rounds: FillRound[]
  /** The player's guesses so far, in round order. */
  guesses: number[]
}

/** Guesses and fills move in 10 ml steps. */
export const STEP_ML = 10
export const POINTS_PER_ROUND = 100
/** Share of the maximum score that counts as a win. */
export const WIN_SHARE = 0.7

/** One round per glass in seeded order; each filled to 15–100 % of its nominal volume. */
export function newFillGame(seed: number): FillGame {
  const order = shuffle(
    GLASSES.map((g) => g.id),
    seed,
  )
  const rnd = seededRandom(seed ^ 0x5bd1e995)
  const rounds = order.map((id) => {
    const { nominal } = GLASS_BY_ID[id]
    const ml = Math.round((nominal * (0.15 + 0.85 * rnd())) / STEP_ML) * STEP_ML
    return { glass: id, ml }
  })
  return { rounds, guesses: [] }
}

/**
 * Points for one guess: 100 for a hit, minus 4 points per percent of the glass's nominal volume
 * the guess is off – so 10 ml off a Stange weighs like 50 ml off a Maß. Never below 0.
 */
export function scoreGuess(round: FillRound, guess: number): number {
  const off = Math.abs(guess - round.ml) / GLASS_BY_ID[round.glass].nominal
  return Math.round(POINTS_PER_ROUND * Math.max(0, 1 - 4 * off))
}

export function guess(game: FillGame, ml: number): FillGame {
  if (isOver(game)) return game
  return { ...game, guesses: [...game.guesses, Math.max(0, Math.round(ml))] }
}

export const isOver = (game: FillGame): boolean => game.guesses.length >= game.rounds.length

export const maxScore = (game: FillGame): number => game.rounds.length * POINTS_PER_ROUND

export const totalScore = (game: FillGame): number =>
  game.guesses.reduce((sum, g, i) => sum + scoreGuess(game.rounds[i], g), 0)

export const isWin = (game: FillGame): boolean => isOver(game) && totalScore(game) >= WIN_SHARE * maxScore(game)
