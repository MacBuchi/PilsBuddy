import { MOTIFS } from './motifs'
import type { Accessory, BottleDesign, Brows, Closure, Extra, Eyes, Gesture, LabelDesign, LabelFont, LabelKind, Mouth } from './types'
import type { ShapeKey } from './shapes'

/**
 * A bottle design from outside (DB catalogue rows) is only trusted after this check: every colour is a
 * plain #RRGGBB, every key is from the known vocabulary, texts are short. The renderer interpolates
 * colours into attributes, so this is what keeps foreign rows from injecting markup.
 */

const SHAPE_KEYS: readonly ShapeKey[] = ['longneck', 'longneck33', 'euro', 'nrw', 'steinie', 'vichy33', 'can']
const CLOSURES: readonly Closure[] = ['crown', 'swing', 'lime', 'can']
const EYES: readonly Eyes[] = ['open', 'happy', 'sleepy', 'dot']
const BROWS: readonly Brows[] = ['none', 'stern', 'thick', 'angry', 'worried', 'up', 'raised']
const MOUTHS: readonly Mouth[] = ['smile', 'flat', 'smirk', 'grin', 'tongue']
const ACCS: readonly Accessory[] = ['blush', 'mustache', 'glasses', 'monocle', 'patch', 'shades', 'lashes', 'bowtie', 'crown', 'mohawk', 'sailor']
const GESTURES: readonly Gesture[] = ['sway', 'nod', 'hop', 'wobble', 'blink', 'wink', 'look', 'brow', 'plopp', 'shades']
const KINDS: readonly LabelKind[] = ['rect', 'oval', 'shield', 'none']
const FONTS: readonly LabelFont[] = ['sans', 'serif', 'gothic']
const EXTRAS: readonly Extra[] = ['smoke', 'goat']

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v)
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max

function label(v: unknown): LabelDesign | null {
  const l = v as Record<string, unknown> | null
  if (!l || typeof l !== 'object') return null
  if (!oneOf(KINDS, l.kind) || !oneOf(FONTS, l.font) || ![l.bg, l.ink, l.a, l.a2].every(isHex)) return null
  if (!text(l.word, 16) || !text(l.region, 24)) return null
  return {
    kind: l.kind,
    bg: l.bg as string,
    ink: l.ink as string,
    a: l.a as string,
    a2: l.a2 as string,
    font: l.font,
    ...(l.frame === true ? { frame: true } : {}),
    word: l.word,
    region: l.region,
    ...(text(l.badge, 16) ? { badge: l.badge } : {}),
  }
}

/** The design if it is complete and well-formed, otherwise undefined (the beer then gets a derived one). */
export function sanitizeDesign(v: unknown): BottleDesign | undefined {
  const d = v as Record<string, unknown> | null
  if (!d || typeof d !== 'object') return undefined
  if (!oneOf(SHAPE_KEYS, d.shape) || !oneOf(CLOSURES, d.closure) || !isHex(d.glass) || !isHex(d.cap)) return undefined
  if (!oneOf(EYES, d.eyes) || !oneOf(BROWS, d.brows) || !oneOf(MOUTHS, d.mouth)) return undefined
  const l = label(d.label)
  if (!l) return undefined
  const neck = d.neckLabel as Record<string, unknown> | undefined
  const list = <T extends string>(all: readonly T[], x: unknown, max: number) => (Array.isArray(x) ? x.filter((i): i is T => oneOf(all, i)).slice(0, max) : [])
  return {
    shape: d.shape,
    ...(d.bulge === true ? { bulge: true } : {}),
    ...(d.waist === true ? { waist: true } : {}),
    closure: d.closure,
    glass: d.glass,
    ...(d.clear === true ? { clear: true } : {}),
    cap: d.cap,
    label: l,
    ...(neck && isHex(neck.bg) && isHex(neck.a) ? { neckLabel: { bg: neck.bg, a: neck.a } } : {}),
    motif: typeof d.motif === 'string' && MOTIFS[d.motif] ? d.motif : null,
    eyes: d.eyes,
    brows: d.brows,
    mouth: d.mouth,
    acc: list(ACCS, d.acc, 3),
    gestures: list(GESTURES, d.gestures, 2),
    ...(oneOf(EXTRAS, d.extra) ? { extra: d.extra } : {}),
  }
}
