import type { ArchetypeId } from './types'

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
export type Stage = 'hidden' | 'raw' | 'full'

export interface AvatarSpec {
  archetype: ArchetypeId
  /** hidden: silhouette with "?" · raw: face · full: face + accessory */
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

export function stageFor(decoded: number): Stage {
  if (decoded < 30) return 'hidden'
  if (decoded < 70) return 'raw'
  return 'full'
}

export function buildAvatar(archetype: ArchetypeId, decoded = 100): AvatarSpec {
  const s = SHAPES[archetype] ?? SHAPES.logo
  const stage = stageFor(decoded)
  return {
    archetype,
    stage,
    glass: s.glass,
    width: s.w,
    height: s.h,
    radius: s.r,
    handle: !!s.handle,
    beerColor: stage === 'hidden' ? HIDDEN_BEER_COLOR : s.beer,
    foamBumps: s.n,
    eyes: s.e,
    mouth: s.m,
    accessory: stage === 'full' ? s.a : 'none',
  }
}
