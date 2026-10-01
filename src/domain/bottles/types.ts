import type { ShapeKey } from './shapes'

/**
 * Everything needed to draw one bottle. Small on purpose (~250 bytes as JSON): designed beers store
 * it as `bottle` override in beers.json, all others derive it from style, colour and taste
 * (`designFor`). The renderer turns it into an SVG string.
 */

export type Eyes = 'open' | 'happy' | 'sleepy' | 'dot'
export type Brows = 'none' | 'stern' | 'thick' | 'angry' | 'worried' | 'up' | 'raised'
export type Mouth = 'smile' | 'flat' | 'smirk' | 'grin' | 'tongue'
/** Face accessories (drawn on the face) and head/neck pieces (drawn on the bottle). */
export type Accessory = 'blush' | 'mustache' | 'glasses' | 'monocle' | 'patch' | 'shades' | 'lashes' | 'bowtie' | 'crown' | 'mohawk' | 'sailor'
/** Body gestures (one at a time) and face gestures; at most two in total. */
export type Gesture = 'sway' | 'nod' | 'hop' | 'wobble' | 'blink' | 'wink' | 'look' | 'brow' | 'plopp' | 'shades'
export type Closure = 'crown' | 'swing' | 'lime' | 'can'
export type LabelKind = 'rect' | 'oval' | 'shield' | 'none'
export type LabelFont = 'sans' | 'serif' | 'gothic'
export type Extra = 'smoke' | 'goat'

export interface LabelDesign {
  kind: LabelKind
  bg: string
  /** Word, region, motif outline. */
  ink: string
  /** Badge line, frame, motif fill. */
  a: string
  /** Second motif colour. */
  a2: string
  font: LabelFont
  /** Inner frame line in `a`. */
  frame?: boolean
  /** Big word, usually the style (PILS, HELL, WEISSE …) – never the brand. */
  word: string
  region: string
  /** Optional prefix of the ABV line, e.g. "SEIT 1405". */
  badge?: string
}

export interface BottleDesign {
  shape: ShapeKey
  /** Weißbier neck / tapered waist (glass bottles only). */
  bulge?: boolean
  waist?: boolean
  closure: Closure
  /** Glass colour (or can colour). */
  glass: string
  /** Clear glass shows the beer inside. */
  clear?: boolean
  /** Crown cap colour. */
  cap: string
  label: LabelDesign
  neckLabel?: { bg: string; a: string }
  /** Motif key from MOTIFS, or null. */
  motif: string | null
  eyes: Eyes
  brows: Brows
  mouth: Mouth
  acc: Accessory[]
  gestures: Gesture[]
  extra?: Extra
}

/** What the renderer needs besides the design. */
export interface RenderInput {
  design: BottleDesign
  /** Beer colour – fill for clear glass. */
  beer: string
  /** "4,9 %" */
  abv: string
  /** Timing seed (e.g. hashId(beer.id)): offsets animations so a shelf never moves in sync. */
  seed: number
  /** Unique id prefix for clip paths when several bottles share a page. */
  uid: string
  /** Leave out all animation (reduced motion, share card, thumbnails). */
  still?: boolean
}
