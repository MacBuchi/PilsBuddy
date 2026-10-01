import { hashId } from '../hash'
import type { Beer } from '../types'
import { MOTIFS } from './motifs'
import { luminance } from './render'
import type { ShapeKey } from './shapes'
import type { Accessory, BottleDesign, Brows, Eyes, Gesture, LabelDesign, Mouth } from './types'

/**
 * A bottle for any beer, derived from style, colour, region, tags and the taste axes – deterministic,
 * so the same beer always looks the same and nothing has to be stored. Designed beers keep their
 * hand-tuned `beer.bottle`. Brand-neutral: the label shows the style, colours come from PilsBuddy
 * palettes, motifs are generic symbols.
 */

/** Label palettes [bg, ink, accent, accent 2], taken from the designed bottles. */
export const PALETTES: readonly (readonly [string, string, string, string])[] = [
  ['#16233F', '#F3E9CF', '#D9A93A', '#D9A93A'],
  ['#F3E8CC', '#2B5A35', '#C79A3A', '#C79A3A'],
  ['#1B2E5C', '#EEF0F2', '#C9A443', '#C9A443'],
  ['#FFFFFF', '#1E3F8A', '#D8AE45', '#D8AE45'],
  ['#C4302B', '#FFF1D8', '#D8AE45', '#D8AE45'],
  ['#F7F3EA', '#1E3F8A', '#F08A2E', '#F08A2E'],
  ['#7A1E1E', '#F1D9A0', '#D8AE45', '#D8AE45'],
  ['#F5F7FA', '#1F4E8C', '#1F4E8C', '#7FB0DE'],
  ['#F7F4EC', '#B8282A', '#C8322B', '#D8AE45'],
  ['#1F4E9A', '#FFF6E3', '#D63A2F', '#D63A2F'],
  ['#1F5A33', '#F1E3B8', '#D8AE45', '#C4302B'],
  ['#F4F4EE', '#1F6B3A', '#D1302B', '#D1302B'],
  ['#1A1410', '#E6C15A', '#B8342B', '#B8342B'],
  ['#1F6B3A', '#F6E7B8', '#E3B94E', '#E3B94E'],
  ['#F1E4C6', '#5A2E14', '#8A4A1E', '#8A4A1E'],
  ['#F2F4F7', '#1F3F73', '#2E5C9A', '#2E5C9A'],
  ['#1E5AA8', '#FFF6E3', '#F29A2E', '#F29A2E'],
  ['#D6372B', '#FFF6E3', '#F39A4B', '#F7B7A0'],
  ['#F3E7C6', '#1F5A33', '#2E7A3F', '#B0702A'],
  ['#B3261E', '#F7E3B0', '#D8AE45', '#D8AE45'],
  ['#C98F3E', '#2E170A', '#6B3316', '#E8C27A'],
  ['#B86A34', '#FFF1D8', '#5A2E14', '#F2B53A'],
  ['#EEF3F8', '#1F3F73', '#2E5C9A', '#9CC3E6'],
  ['#F3E9D2', '#9E2A22', '#B93A2E', '#2F6B3A'],
  ['#DDB54E', '#1F4A36', '#1F4A36', '#F3E9CF'],
  ['#5A2E14', '#F1D9A0', '#D8AE45', '#B3261E'],
]

export const GLASS = {
  brown: '#6B3A17',
  green: '#2E6B3B',
  dark: '#3B2414',
  black: '#211812',
  clear: '#F4F7EE',
} as const

const CAPS = ['#F2B53A', '#C4302B', '#1F4E9A', '#C9CFC8', '#2E6B3B']

interface StyleRule {
  word: string
  shapes: ShapeKey[]
  /** Label font; 'gothic' is mixed with 'serif' for old-school styles. */
  font: LabelDesign['font']
  motifs: string[]
  glass?: keyof typeof GLASS
}

/** Style → label word, bottle shapes, font and fitting motifs. Unknown styles fall back to Pils-ish. */
const STYLES: Record<string, StyleRule> = {
  Pils: { word: 'PILS', shapes: ['longneck', 'nrw', 'vichy33', 'steinie'], font: 'serif', motifs: ['shield', 'seal', 'star', 'crown', 'castle', 'key', 'gate'] },
  Helles: { word: 'HELL', shapes: ['euro'], font: 'serif', motifs: ['arch', 'lake', 'treemount', 'lozenge', 'monk'] },
  Export: { word: 'EXPORT', shapes: ['euro'], font: 'sans', motifs: ['star', 'stripes', 'seal', 'crown'] },
  Märzen: { word: 'MÄRZEN', shapes: ['euro'], font: 'serif', motifs: ['lozenge', 'arch', 'castle'] },
  Landbier: { word: 'LANDBIER', shapes: ['euro', 'nrw'], font: 'serif', motifs: ['tree', 'fachwerk', 'treemount'] },
  Kellerbier: { word: 'KELLER', shapes: ['euro', 'nrw'], font: 'serif', motifs: ['fachwerk', 'monk', 'gable', 'tree'] },
  Zwickel: { word: 'ZWICKEL', shapes: ['euro', 'nrw'], font: 'serif', motifs: ['fachwerk', 'gable', 'tree'] },
  Weißbier: { word: 'WEISSE', shapes: ['longneck'], font: 'serif', motifs: ['monk', 'bubbles', 'lozenge', 'shield'] },
  'Dunkles Weißbier': { word: 'WEISSE', shapes: ['longneck'], font: 'serif', motifs: ['monk', 'monastery', 'lozenge'], glass: 'dark' },
  'Alkoholfreies Weißbier': { word: 'WEISSE', shapes: ['longneck'], font: 'sans', motifs: ['bubbles', 'swoosh'] },
  Dunkles: { word: 'DUNKEL', shapes: ['euro'], font: 'serif', motifs: ['monastery', 'monk', 'castle'], glass: 'dark' },
  Schwarzbier: { word: 'SCHWARZ', shapes: ['longneck', 'euro'], font: 'serif', motifs: ['shield', 'castle', 'star'], glass: 'black' },
  Bock: { word: 'Bock', shapes: ['euro', 'steinie'], font: 'gothic', motifs: ['goat', 'shield'] },
  Doppelbock: { word: 'DOPPELBOCK', shapes: ['euro', 'steinie'], font: 'serif', motifs: ['monastery', 'goat', 'monk'], glass: 'dark' },
  Rauchbier: { word: 'Rauchbier', shapes: ['euro'], font: 'gothic', motifs: ['fachwerk', 'gable'] },
  Kölsch: { word: 'KÖLSCH', shapes: ['longneck33'], font: 'sans', motifs: ['dom', 'confetti', 'gable'] },
  Altbier: { word: 'ALT', shapes: ['euro', 'nrw'], font: 'serif', motifs: ['gable', 'seal', 'castle'] },
  Bier: { word: 'BIER', shapes: ['euro', 'nrw', 'longneck33'], font: 'serif', motifs: ['shield', 'star', 'seal', 'crown', 'gable'] },
  Lager: { word: 'LAGER', shapes: ['longneck33', 'longneck'], font: 'sans', motifs: ['star', 'crown', 'horn', 'swoosh'] },
  Amber: { word: 'AMBER', shapes: ['euro', 'longneck33'], font: 'serif', motifs: ['star', 'seal', 'horn'] },
  'Pale Ale': { word: 'PALE ALE', shapes: ['can', 'longneck33'], font: 'sans', motifs: ['grapefruit', 'bolt', 'anchor'] },
  IPA: { word: 'IPA', shapes: ['can'], font: 'sans', motifs: ['bolt', 'grapefruit'] },
  Stout: { word: 'STOUT', shapes: ['euro', 'can'], font: 'serif', motifs: ['harp', 'anchor'], glass: 'black' },
  Porter: { word: 'PORTER', shapes: ['euro', 'nrw'], font: 'serif', motifs: ['anchor', 'ship', 'harp'], glass: 'black' },
  'Belgian Strong Ale': { word: 'STRONG', shapes: ['steinie'], font: 'serif', motifs: ['devil', 'arch'] },
  'Abbey Blonde': { word: 'BLONDE', shapes: ['steinie'], font: 'serif', motifs: ['arch', 'monastery'] },
  Trappist: { word: 'TRAPPIST', shapes: ['steinie'], font: 'serif', motifs: ['monastery', 'arch'], glass: 'dark' },
  Alkoholfrei: { word: '0,0', shapes: ['longneck33', 'longneck'], font: 'sans', motifs: ['swoosh', 'stripes', 'star'] },
  'Berliner Weisse': { word: 'BERLINER', shapes: ['longneck33'], font: 'sans', motifs: ['bubbles', 'confetti'], glass: 'clear' },
  Gose: { word: 'GOSE', shapes: ['longneck33'], font: 'sans', motifs: ['waves', 'bubbles'] },
  Radler: { word: 'RADLER', shapes: ['longneck33'], font: 'sans', motifs: ['swoosh', 'grapefruit'], glass: 'clear' },
}

/** Regions/tags that pull a motif in, before the style motifs. */
const PLACE_MOTIFS: [RegExp, string[]][] = [
  [/friesland|ostsee|nordsee|hamburg|bremen|flensburg|kiel|stralsund|rostock|küste/i, ['anchor', 'ship', 'waves', 'key']],
  [/schwarzwald|wald|harz/i, ['tree', 'treemount']],
  [/alpen|tegernsee|oberbayern|allgäu|tirol|berg/i, ['lake', 'treemount', 'rock']],
  [/köln/i, ['dom']],
  [/kloster|abtei|trappist/i, ['monastery', 'monk']],
]

const pick = <T>(items: readonly T[], h: number, salt: number): T => items[(h >>> (salt * 3)) % items.length]

/** The style rule for a beer – exact name first, then by keyword. */
export function styleRule(style: string): StyleRule {
  if (STYLES[style]) return STYLES[style]
  const s = style.toLowerCase()
  if (/alkoholfrei|0,0/.test(s)) return /weiß|weiss|weizen/.test(s) ? STYLES['Alkoholfreies Weißbier'] : STYLES.Alkoholfrei
  if (/weiß|weiss|weizen/.test(s)) return STYLES.Weißbier
  if (/doppelbock|eisbock/.test(s)) return STYLES.Doppelbock
  if (/bock/.test(s)) return STYLES.Bock
  if (/ipa/.test(s)) return STYLES.IPA
  if (/amber|wiener/.test(s)) return STYLES.Amber
  if (/ale/.test(s)) return STYLES['Pale Ale']
  if (/stout/.test(s)) return STYLES.Stout
  if (/porter/.test(s)) return STYLES.Porter
  if (/keller|zwickel|zwickl/.test(s)) return STYLES.Kellerbier
  if (/dunkel/.test(s)) return STYLES.Dunkles
  if (/hell/.test(s)) return STYLES.Helles
  if (/märzen|maerzen|festbier/.test(s)) return STYLES.Märzen
  if (/lager/.test(s)) return STYLES.Lager
  return STYLES.Pils
}

/** Face from the taste axes – the "character" fine-tuning of the template. */
export function faceFor(beer: Beer, h: number): { eyes: Eyes; brows: Brows; mouth: Mouth; acc: Accessory[] } {
  const t = beer.taste
  const sweetish = t.sweetness >= 55
  const eyes: Eyes = t.body >= 75 && beer.abv >= 6.5 ? 'sleepy' : t.drinkability >= 80 && t.bitterness < 45 ? 'happy' : t.character < 35 ? 'dot' : 'open'
  const brows: Brows =
    t.bitterness >= 85 ? 'thick' : t.bitterness >= 70 && t.character >= 75 ? 'angry' : t.bitterness >= 65 ? 'stern' : t.character >= 75 && t.maltiness >= 65 ? 'raised' : sweetish ? 'up' : t.character < 40 ? 'none' : 'up'
  const mouth: Mouth =
    t.hopIntensity >= 85 ? 'tongue' : t.bitterness >= 70 ? 'flat' : t.character >= 75 && !sweetish ? 'smirk' : sweetish || t.drinkability >= 80 ? 'grin' : 'smile'
  const acc: Accessory[] = []
  const tags = beer.tags.join(' ').toLowerCase()
  if (sweetish || (t.drinkability >= 85 && t.bitterness < 40)) acc.push('blush')
  if (/kloster|abtei|trappist/.test(tags)) acc.push('glasses')
  else if (/tradition|urgestein|klassiker|legende/.test(tags)) acc.push(h % 2 ? 'mustache' : 'monocle')
  else if (/strand|sommer|limette/.test(tags)) acc.push('shades')
  else if (/kultstatus/.test(tags)) acc.push('crown')
  return { eyes, brows, mouth, acc: acc.slice(0, 2) }
}

/** One body gesture from the character, one face gesture; never "wobble" for alcohol-free beers. */
export function gesturesFor(beer: Beer, d: Pick<BottleDesign, 'eyes' | 'brows' | 'acc' | 'closure'>, h: number): Gesture[] {
  const t = beer.taste
  const body: Gesture = t.drinkability >= 80 && beer.abv < 6 ? 'hop' : beer.abv >= 7 ? 'nod' : 'sway'
  const lid = d.eyes === 'open' || d.eyes === 'dot'
  let face: Gesture | null = null
  if (d.acc.includes('shades')) face = 'shades'
  else if (d.closure === 'swing') face = 'plopp'
  else if (t.character >= 75 && d.brows !== 'none') face = 'brow'
  else if (lid) face = t.bitterness >= 70 ? 'look' : h % 3 === 0 ? 'wink' : 'blink'
  return face ? [body, face] : [body]
}

/** Label kind from style family: shields for monastic/Weißbier, ovals for traditional, else rectangles. */
function labelKind(rule: StyleRule, shape: ShapeKey, h: number): LabelDesign['kind'] {
  if (shape === 'can') return 'none'
  if (rule.motifs.includes('monk') || rule.motifs.includes('monastery')) return pick(['shield', 'rect', 'oval'] as const, h, 4)
  return pick(['rect', 'rect', 'oval', 'shield'] as const, h, 4)
}

/** Shapes that hold 0.33 l; the others are half-litre bottles. */
const SMALL: readonly ShapeKey[] = ['longneck33', 'vichy33', 'steinie', 'can']

/** The style's shapes, narrowed by what the product data knows about the container. */
function shapeFor(rule: StyleRule, beer: Beer, h: number): ShapeKey {
  const p = beer.pack
  if (!p) return pick(rule.shapes, h, 0)
  if (p.can) return 'can'
  let shapes = rule.shapes.filter((s) => s !== 'can')
  if (p.ml) {
    const small = p.ml <= 400
    shapes = shapes.filter((s) => SMALL.includes(s) === small)
    if (!shapes.length) shapes = [small ? 'longneck33' : 'euro']
  }
  return pick(shapes.length ? shapes : ['longneck33'], h, 0)
}

export function designFor(beer: Beer): BottleDesign {
  const h = hashId(beer.id)
  const rule = styleRule(beer.style)
  const tags = beer.tags.join(' ').toLowerCase()
  const shape = shapeFor(rule, beer, h)
  const glassKey = /limette|klarglas/.test(tags)
    ? 'clear'
    : (rule.glass ?? (/grüne flasche/.test(tags) || ((rule.word === 'PILS' || rule.word === 'LAGER') && h % 3 === 0) ? 'green' : luminance(beer.color) < 0.04 ? 'black' : 'brown'))
  const clear = glassKey === 'clear'
  const glassColor = GLASS[glassKey]
  // a label must never melt into its glass (or, on cans, the can is the label)
  const candidates = PALETTES.filter((p) => shape === 'can' || Math.abs(luminance(p[0]) - luminance(glassColor)) > 0.12)
  const [bg, ink, a, a2] = pick(candidates, h, 1)
  const place = PLACE_MOTIFS.find(([re]) => re.test(beer.region) || re.test(tags))
  const motifs = (place ? place[1] : rule.motifs).filter((m) => MOTIFS[m])
  const closure: BottleDesign['closure'] =
    shape === 'can' ? 'can' : beer.pack?.swing || /bügel/.test(tags) || (rule.word === 'KELLER' && h % 2 === 0) ? 'swing' : clear && /limette/.test(tags) ? 'lime' : 'crown'
  // Fraktur only in mixed case; half of the old-school styles get the serif instead
  const font: LabelDesign['font'] = rule.font === 'gothic' && h % 2 === 0 ? 'serif' : rule.font
  const face = faceFor(beer, h)
  const base = {
    shape,
    ...(rule.word === 'WEISSE' && shape === 'longneck' ? { bulge: true } : {}),
    closure,
    glass: shape === 'can' ? bg : glassColor,
    ...(clear ? { clear: true } : {}),
    cap: pick(CAPS, h, 2),
    label: {
      kind: labelKind(rule, shape, h),
      bg,
      ink,
      a,
      a2,
      font,
      ...(h % 4 === 0 ? { frame: true } : {}),
      word: rule.word,
      region: beer.region.toUpperCase().slice(0, 18),
      ...(beer.founded && beer.founded >= 1000 && beer.founded <= 2100 ? { badge: `SEIT ${beer.founded}` } : {}),
    },
    ...(shape === 'longneck' || shape === 'longneck33' ? { neckLabel: { bg, a: h % 2 ? a : ink } } : {}),
    motif: pick(motifs.length ? motifs : ['shield'], h, 3),
    ...face,
    ...(rule.motifs.includes('goat') && h % 3 === 0 ? { extra: 'goat' as const } : {}),
    ...(rule.word === 'Rauchbier' ? { extra: 'smoke' as const } : {}),
  }
  return { ...base, gestures: gesturesFor(beer, base, h) }
}

/** The hand-tuned design if the beer has one, otherwise the derived one. */
export function bottleDesign(beer: Beer): BottleDesign {
  return beer.bottle ?? designFor(beer)
}
