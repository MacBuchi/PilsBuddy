import type { Accessory, Brows, Eyes, Gesture, Mouth } from './types'

/**
 * Face parts in face coordinates (eyes at x = ±34, brows around y = −30, mouth at y = 46),
 * taken over from the designed bottles. `ink` is the face colour: cream on dark glass,
 * near-black on clear glass.
 */

export const INK = '#1D1811'
export const CREAM = '#FFF6E3'

/** One looping SMIL animation; `t` = [duration s, begin s]. */
export function anim(type: 'translate' | 'rotate' | 'scale', values: string, keyTimes: string, t: [number, number], spline = false): string {
  const s = spline ? ` calcMode="spline" keySplines="${Array(keyTimes.split(';').length - 1).fill('.45 0 .55 1').join(';')}"` : ''
  return `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${t[0].toFixed(2)}s" begin="${t[1].toFixed(1)}s" repeatCount="indefinite" keyTimes="${keyTimes}"${s}/>`
}

const BLINK = ['1 1;1 1;1 .08;1 1;1 1', '0;.9;.93;.96;1'] as const
const WINK = ['1 1;1 1;1 .08;1 .08;1 1;1 1', '0;.8;.84;.9;.94;1'] as const
const LOOK = ['0 0;0 0;-7 0;-7 0;7 0;7 0;0 0', '0;.3;.36;.55;.61;.85;1'] as const
const BROW = ['0 0;0 0;0 -10;0 -10;0 0', '0;.55;.62;.85;1'] as const
const SHADES = ['0 0;0 0;0 26;0 26;0 0;0 0', '0;.5;.56;.8;.86;1'] as const

export interface FaceTiming {
  blink: [number, number]
  wink: [number, number]
  look: [number, number]
  brow: [number, number]
  shades: [number, number]
}

function eye(kind: Eyes, ink: string, lid: string, pupilAnim: string): string {
  const pupil = (r: number, cy: number) =>
    `<g>${pupilAnim}<circle cy="${cy}" r="${r}" fill="${INK}"/><circle cx="3" cy="-1" r="2.6" fill="${CREAM}"/></g>`
  switch (kind) {
    case 'happy':
      return `<path d="M-15 5Q0 -15 15 5" fill="none" stroke="${ink}" stroke-width="7.70" stroke-linecap="round"/>`
    case 'sleepy':
      return (
        `<circle r="17" fill="${CREAM}" stroke="${INK}" stroke-width="4.89"/><circle cy="6" r="8" fill="${INK}"/>` +
        `<path d="M-18.5 1A18.5 18.5 0 0 1 18.5 1Z" fill="${lid}" stroke="${INK}" stroke-width="4.89" stroke-linejoin="round"/>`
      )
    case 'dot':
      return `<circle r="13" fill="${CREAM}" stroke="${INK}" stroke-width="4.89"/>${pupil(6.5, 2)}`
    default:
      return `<circle r="17" fill="${CREAM}" stroke="${INK}" stroke-width="4.89"/>${pupil(8.5, 2)}`
  }
}

const BROW_PATH: Record<Exclude<Brows, 'none' | 'raised'>, string> = {
  up: 'M-15 -30Q0 -42 15 -32',
  stern: 'M-15 -30L15 -30',
  thick: 'M-15 -31L15 -31',
  angry: 'M-15 -24L15 -35',
  worried: 'M-15 -35L15 -26',
}

const browLine = (d: string, ink: string, width = 7.7) =>
  `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${width.toFixed(2)}" stroke-linecap="round"/>`

function brows(kind: Brows, ink: string, browAnim: string): string {
  if (kind === 'none') return ''
  const left = kind === 'raised' ? BROW_PATH.stern : BROW_PATH[kind]
  const right = kind === 'raised' ? 'M-15 -38Q0 -52 15 -40' : BROW_PATH[kind]
  const w = kind === 'thick' ? 13.29 : 7.7
  return (
    `<g transform="translate(-34 0) scale(-1 1)">${browLine(left, ink, w)}</g>` +
    `<g transform="translate(34 0)"><g>${browAnim}${browLine(right, ink, w)}</g></g>`
  )
}

function mouth(kind: Mouth, ink: string): string {
  const grin = `<path d="M-24 -6Q0 30 24 -6Z" fill="#7A2418" stroke="${ink}" stroke-width="5.60" stroke-linejoin="round"/>`
  const line = (d: string) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="7.70" stroke-linecap="round"/>`
  const inner = {
    smile: line('M-20 -4Q0 16 20 -4'),
    flat: line('M-14 2H14'),
    smirk: line('M-18 2Q4 10 20 -8'),
    grin,
    tongue: `${grin}<ellipse cx="5" cy="15" rx="9" ry="11" fill="#F08A9A" stroke="${INK}" stroke-width="3.92"/>`,
  }[kind]
  return `<g transform="translate(0 46)">${inner}</g>`
}

/** Accessories that live on the face (the others are drawn on the bottle, see render.ts). */
function faceAccessories(acc: Accessory[], ink: string, shadesAnim: string): string {
  let out = ''
  if (acc.includes('mustache')) out += `<path d="M0 28C-8 20 -28 20 -40 36C-24 30 -12 36 0 32C12 36 24 30 40 36C28 20 8 20 0 28Z" fill="${ink}"/>`
  if (acc.includes('lashes')) {
    const d = 'M-10 -15L-14 -23M2 -17L3 -27M13 -12L19 -19'
    out += `<path transform="translate(-34 0) scale(-1 1)" d="${d}" fill="none" stroke="${ink}" stroke-width="3.85" stroke-linecap="round"/>`
    out += `<path transform="translate(34 0)" d="${d}" fill="none" stroke="${ink}" stroke-width="3.85" stroke-linecap="round"/>`
  }
  if (acc.includes('glasses'))
    out +=
      `<circle cx="-34" r="23" fill="none" stroke="${ink}" stroke-width="4.2"/><circle cx="34" r="23" fill="none" stroke="${ink}" stroke-width="4.2"/>` +
      `<path d="M-11 -3Q0 -9 11 -3" fill="none" stroke="${ink}" stroke-width="4.2" stroke-linecap="round"/>`
  if (acc.includes('monocle'))
    out +=
      `<circle cx="34" r="24" fill="none" stroke="#F2B53A" stroke-width="5.60"/>` +
      `<path d="M57 8Q68 42 50 74" stroke="#F2B53A" stroke-width="3.15" fill="none" stroke-linecap="round"/>`
  if (acc.includes('patch')) out += `<path d="M-66 -28L64 -54" stroke="${INK}" stroke-width="6.3"/><ellipse cx="-34" cy="1" rx="22" ry="20" fill="${INK}"/>`
  if (acc.includes('shades'))
    out +=
      `<g>${shadesAnim}<rect x="-62" y="-17" width="52" height="32" rx="13" fill="${INK}" stroke="${ink}" stroke-width="2.44"/>` +
      `<rect x="10" y="-17" width="52" height="32" rx="13" fill="${INK}" stroke="${ink}" stroke-width="2.44"/>` +
      `<path d="M-10 -8H10" stroke="${ink}" stroke-width="4.2"/>` +
      `<path d="M-50 -7H-38M22 -7H34" stroke="${ink}" stroke-width="3.85" stroke-linecap="round" opacity=".75"/></g>`
  return out
}

export interface FaceInput {
  eyes: Eyes
  brows: Brows
  mouth: Mouth
  acc: Accessory[]
  gestures: Gesture[]
  ink: string
  /** Eyelid colour = glass colour. */
  lid: string
  timing: FaceTiming
  still: boolean
}

/** The face group content (without the outer translate/scale). */
export function renderFace(f: FaceInput): string {
  const on = (g: Gesture) => !f.still && f.gestures.includes(g)
  // blinking only makes sense with eyes that have a lid to close
  const lidEyes = f.eyes === 'open' || f.eyes === 'dot'
  const blink = on('blink') && lidEyes ? anim('scale', BLINK[0], BLINK[1], f.timing.blink) : ''
  const wink = on('wink') && lidEyes ? anim('scale', WINK[0], WINK[1], f.timing.wink) : ''
  const look = on('look') && lidEyes ? anim('translate', LOOK[0], LOOK[1], f.timing.look) : ''
  const browAnim = on('brow') ? anim('translate', BROW[0], BROW[1], f.timing.brow) : ''
  const shadesAnim = on('shades') ? anim('translate', SHADES[0], SHADES[1], f.timing.shades) : ''

  let out = ''
  if (f.acc.includes('blush'))
    out += `<ellipse cx="-52" cy="24" rx="13" ry="7.5" fill="#F2877A" opacity=".85"/><ellipse cx="52" cy="24" rx="13" ry="7.5" fill="#F2877A" opacity=".85"/>`
  if (!f.acc.includes('patch')) out += `<g transform="translate(-34 0)"><g>${blink}${eye(f.eyes, f.ink, f.lid, look)}</g></g>`
  out += `<g transform="translate(34 0)"><g>${blink || wink}${eye(f.eyes, f.ink, f.lid, look)}</g></g>`
  out += brows(f.brows, f.ink, browAnim)
  out += mouth(f.mouth, f.ink)
  out += faceAccessories(f.acc, f.ink, shadesAnim)
  return out
}
