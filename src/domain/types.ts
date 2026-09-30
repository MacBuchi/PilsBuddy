/**
 * Core domain types. Nothing in here depends on React, storage or the network,
 * so the same model can later back social matching and a remote backend.
 */

/** How the user relates to a beer. UNKNOWN and DISLIKE are deliberately distinct. */
export type Rating = 'LIKE' | 'DISLIKE' | 'KNOW' | 'UNKNOWN' | 'WANT_TO_TRY'

export const RATINGS: readonly Rating[] = ['LIKE', 'DISLIKE', 'WANT_TO_TRY', 'KNOW', 'UNKNOWN']

/** Taste axes, each 0–100. Order matters: it is the vector layout used everywhere. */
export const TASTE_AXES = [
  'bitterness',
  'hopIntensity',
  'maltiness',
  'sweetness',
  'dryness',
  'body',
  'drinkability',
  'character',
] as const

export type TasteAxis = (typeof TASTE_AXES)[number]

export type TasteVector = Record<TasteAxis, number>

export interface Beer {
  id: string
  name: string
  /** Full product name, e.g. "Jever Pilsener". */
  fullName: string
  brewery: string
  country: string
  region: string
  /** Alcohol by volume in percent, e.g. 4.9 */
  abv: number
  style: string
  taste: TasteVector
  description: string
  humorousBio: string
  /** Optional roast shown when the user dislikes this beer. */
  disLikeQuip?: string
  tags: string[]
  /** Card background – "beer colour". */
  color: string
  /** Optional bottle image URL; card shows a placeholder glass without it. */
  image?: string
  /** Reference beers form the onboarding deck; they should cover diverse taste profiles. */
  reference?: boolean
}

export interface RatingEntry {
  rating: Rating
  /** Unix ms; lets us order history and later sync. */
  at: number
}

/** Everything PilsBuddy knows about one user. Keyed by beer id. */
export type Ratings = Record<string, RatingEntry>

export interface RatingCounts {
  LIKE: number
  DISLIKE: number
  KNOW: number
  UNKNOWN: number
  WANT_TO_TRY: number
  total: number
}

/**
 * The user's Bier-DNA: a taste vector plus a separate interest signal.
 * `curiosity` is fed by WANT_TO_TRY / UNKNOWN and never by dislikes.
 */
export interface BeerDNA {
  taste: TasteVector
  /** 0–100 */
  curiosity: number
  /** 0–100 – how "decoded" the profile is. */
  decoded: number
  counts: RatingCounts
}

export type ArchetypeId =
  | 'logo'
  | 'herb'
  | 'feierabend'
  | 'abenteurer'
  | 'geniesser'
  | 'philosoph'
  | 'probierer'
  | 'kasten'
