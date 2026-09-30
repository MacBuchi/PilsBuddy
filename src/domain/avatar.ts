import { BEER_BY_ID } from '../data/beers'
import { compatibility } from './matching'
import type { ArchetypeId, Beer, Ratings, TasteVector } from './types'

/**
 * Avatar = a bundle of visual attributes derived from the Bier-DNA, not an image.
 * Today every attribute follows from the archetype and the decoded percentage;
 * later rules (seasonal accessories, achievement stickers, foam height = activity)
 * can add to this without changing the renderer.
 */

export type GlassForm = 'stange' | 'becher' | 'tulpe' | 'seidel' | 'probierglas' | 'glas'
export type Eyes = 'Dot' | 'Flat' | 'Happy' | 'Wide' | 'Shades' | 'Wink' | 'Curious' | 'Specs'
export type Mouth = 'Smile' | 'Line' | 'O' | 'Grin'
export type Accessory = 'none' | 'Brow' | 'Must' | 'Blush' | 'Tie' | 'Hop' | 'Cap' | 'Star'
export type Stage = 'hidden' | 'raw' | 'full' | 'stammgast'

/** Achievement ids that earn a sticker on the glass, most prestigious first. */
export const STICKER_ORDER = [
  'kasten-kenner',
  'pils-fluesterer',
  'entschluesselt',
  'wort-gehalten',
  'hopfen-herz',
  'hohe-ansprueche',
  'neugiernase',
  'ehrlich',
] as const
export type StickerId = (typeof STICKER_ORDER)[number]
export const MAX_STICKERS = 2
/** Ratings needed for the "Stammgast" stage (glass stands on a Bierdeckel). */
export const STAMMGAST_AT = 25
/** Ratings within this window count as recent activity (foam height). */
export const ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const ACTIVITY_FULL = 10

export interface AvatarSpec {
  archetype: ArchetypeId
  /** hidden: silhouette with "?" · raw: face · full: face + accessory · stammgast: + Bierdeckel */
  stage: Stage
  glass: GlassForm
  /** glass geometry on the 120×120 canvas */
  width: number
  height: number
  radius: string
  handle: boolean
  beerColor: string
  foamBumps: number
  eyes: Eyes
  mouth: Mouth
  accessory: Accessory
  /** Up to two achievement stickers on the glass. */
  stickers: StickerId[]
  /** 0–1 activity in the last 7 days → foam height. */
  foam: number
}

/** Everything beyond archetype + decoded that shapes the avatar. All optional. */
export interface AvatarExtras {
  total?: number
  unlocked?: readonly string[]
  /** 0–1, see avatarExtras(). */
  activity?: number
  /** Colour of the favourite liked beer – the glass takes it once fully decoded. */
  favoriteColor?: string
}

interface Shape {
  glass: GlassForm
  w: number
  h: number
  r: string
  beer: string
  n: number
  e: Eyes
  m: Mouth
  a: Accessory
  handle?: boolean
}

/** Glass character per archetype (Designsystem §2a). */
const SHAPES: Record<ArchetypeId, Shape> = {
  logo: { glass: 'glas', w: 54, h: 80, r: '6px 6px 13px 13px', beer: '#F2B53A', n: 3, e: 'Dot', m: 'Smile', a: 'none' },
  herb: { glass: 'stange', w: 48, h: 86, r: '5px 5px 9px 9px', beer: '#E9C552', n: 3, e: 'Flat', m: 'Line', a: 'Brow' },
  feierabend: { glass: 'becher', w: 60, h: 78, r: '4px 4px 18px 18px', beer: '#F0B23B', n: 4, e: 'Happy', m: 'Grin', a: 'Tie' },
  abenteurer: { glass: 'tulpe', w: 58, h: 80, r: '14px 14px 30px 30px', beer: '#DB8A2A', n: 4, e: 'Wide', m: 'O', a: 'Hop' },
  geniesser: { glass: 'becher', w: 62, h: 72, r: '6px 6px 14px 14px', beer: '#F4CB5E', n: 4, e: 'Shades', m: 'Smile', a: 'Blush' },
  philosoph: { glass: 'seidel', w: 62, h: 76, r: '8px 8px 12px 12px', beer: '#B8651E', n: 5, e: 'Specs', m: 'Line', a: 'Must', handle: true },
  probierer: { glass: 'probierglas', w: 46, h: 66, r: '12px 12px 24px 24px', beer: '#E7A33A', n: 3, e: 'Curious', m: 'O', a: 'Star' },
  kasten: { glass: 'glas', w: 60, h: 76, r: '6px 6px 10px 10px', beer: '#EDB847', n: 4, e: 'Wink', m: 'Grin', a: 'Cap' },
}

export const HIDDEN_BEER_COLOR = '#CFC5B3'

export function stageFor(decoded: number, total = 0): Stage {
  if (decoded < 30) return 'hidden'
  if (decoded < 70) return 'raw'
  return total >= STAMMGAST_AT ? 'stammgast' : 'full'
}

/**
 * Derives the avatar extras from ratings. `now` is passed in so the result is reproducible;
 * the favourite is the liked beer closest to the current taste (ties: dataset order).
 */
export function avatarExtras(
  ratings: Ratings,
  taste: TasteVector,
  unlocked: readonly string[],
  now: number,
  lookup: Readonly<Record<string, Beer>> = BEER_BY_ID,
): AvatarExtras {
  const entries = Object.entries(ratings)
  const recent = entries.filter(([, e]) => e.at > now - ACTIVITY_WINDOW_MS && e.at <= now).length
  let favorite: { color: string; pct: number } | null = null
  for (const [id, e] of entries) {
    const beer = lookup[id]
    if (!beer || e.rating !== 'LIKE') continue
    const pct = compatibility(taste, beer.taste)
    if (!favorite || pct > favorite.pct) favorite = { color: beer.color, pct }
  }
  return {
    total: entries.length,
    unlocked,
    activity: Math.min(1, recent / ACTIVITY_FULL),
    favoriteColor: favorite?.color,
  }
}

export function buildAvatar(archetype: ArchetypeId, decoded = 100, extras: AvatarExtras = {}): AvatarSpec {
  const s = SHAPES[archetype] ?? SHAPES.logo
  const stage = stageFor(decoded, extras.total ?? 0)
  const grown = stage === 'full' || stage === 'stammgast'
  const unlocked = new Set(extras.unlocked ?? [])
  return {
    archetype,
    stage,
    glass: s.glass,
    width: s.w,
    height: s.h,
    radius: s.r,
    handle: !!s.handle,
    beerColor: stage === 'hidden' ? HIDDEN_BEER_COLOR : grown && extras.favoriteColor ? extras.favoriteColor : s.beer,
    foamBumps: s.n,
    eyes: s.e,
    mouth: s.m,
    accessory: grown ? s.a : 'none',
    stickers: stage === 'hidden' ? [] : STICKER_ORDER.filter((id) => unlocked.has(id)).slice(0, MAX_STICKERS),
    foam: extras.activity ?? 0,
  }
}
