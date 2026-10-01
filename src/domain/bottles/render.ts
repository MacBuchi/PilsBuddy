import { anim, CREAM, INK, renderFace } from './face'
import type { FaceTiming } from './face'
import { METRIC_CHARS, METRICS } from './metrics'
import { MOTIFS } from './motifs'
import { bodyPath, CAN, FLOOR, hasNeckRoom, labelBox, SHAPES } from './shapes'
import type { ShapeDef } from './shapes'
import { isHex } from './sanitize'
import type { BottleDesign, RenderInput } from './types'

/**
 * Bottle design → animated SVG string (600 × 1200, floor y = 1188). Pure and deterministic: the same
 * input gives the same string, timings come from `seed`. Text is escaped – names may come from the DB.
 * Uses the app's fonts (Bricolage Grotesque, Young Serif, UnifrakturCook), so it is meant to be inlined.
 */

const S = 7 // outline width
const SHADOW = 2.2 * S
const n = (v: number) => +v.toFixed(2)

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

const FONT = {
  sans: { family: "'Bricolage Grotesque Variable','Bricolage Grotesque',sans-serif", weight: 800, metric: 'sans800', spacing: -0.02 },
  serif: { family: "'Young Serif',serif", weight: 400, metric: 'serif', spacing: 0 },
  gothic: { family: "'UnifrakturCook',serif", weight: 700, metric: 'gothic', spacing: 0 },
} as const
const SANS = FONT.sans.family

/** Text width in units for a font size, with letter spacing in em. */
export function textWidth(text: string, metric: keyof typeof METRICS | string, size: number, spacingEm = 0): number {
  const table = METRICS[metric]
  let w = 0
  for (const ch of text) {
    const i = METRIC_CHARS.indexOf(ch)
    w += i >= 0 ? table[i] : 600
  }
  return (w / 1000) * size + spacingEm * size * Math.max(0, [...text].length - 1)
}

/** Deterministic pseudo-random in [0, 1) from a seed and a salt. */
function rnd(seed: number, salt: number): number {
  let x = (seed ^ (salt * 0x9e3779b1)) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}
const between = (seed: number, salt: number, a: number, b: number) => a + rnd(seed, salt) * (b - a)

/** Durations/begins per gesture, offset per bottle so a shelf never moves in sync. */
function timings(seed: number) {
  const begin = n(between(seed, 1, 0, 1.6))
  const face: FaceTiming = {
    blink: [between(seed, 2, 4.4, 5.8), begin],
    wink: [between(seed, 3, 3, 4.1), begin],
    look: [between(seed, 4, 5.1, 5.6), begin],
    brow: [between(seed, 5, 3.6, 4.4), begin],
    shades: [between(seed, 6, 5.1, 5.6), begin],
  }
  return {
    begin,
    face,
    sway: [between(seed, 7, 2.9, 3.9), begin] as [number, number],
    nod: [between(seed, 8, 3.8, 4.9), begin] as [number, number],
    hop: [between(seed, 9, 1.4, 2.7), begin] as [number, number],
    wobble: [between(seed, 10, 2.8, 3.2), begin] as [number, number],
    plopp: [between(seed, 11, 4.2, 4.8), begin] as [number, number],
    goat: [between(seed, 12, 1.9, 2.2), begin] as [number, number],
  }
}

/** Relative luminance 0–1 of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const v = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * v(1) + 0.7152 * v(3) + 0.0722 * v(5)
}

// ---------------------------------------------------------------- label ----

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Ids inside a motif (clip paths) get the bottle's uid, so many inline bottles never collide. */
const scopeIds = (svg: string, uid: string) => svg.replace(/id="([\w-]+)"/g, `id="${uid}-$1"`).replace(/url\(#([\w-]+)\)/g, `url(#${uid}-$1)`)

/** Motif, big word, region and ABV line – centred as one block inside the box. */
function labelBlock(d: BottleDesign, box: Box, abv: string, inset: number, uid: string): string {
  const l = d.label
  const font = FONT[l.font]
  const fitW = box.w * inset
  const word = l.font === 'gothic' ? l.word : l.word.toUpperCase()
  const ws = n(Math.min(0.168 * box.h, fitW / (textWidth(word, font.metric, 1, font.spacing) || 1)))
  const region = l.region.toUpperCase()
  const rs = n(Math.min(24, fitW / (textWidth(region, 'sans700', 1, 0.12) || 1)))
  const k = rs / 24
  const line3 = (l.badge ? `${l.badge.toUpperCase()} · ` : '') + abv
  const bs = n(Math.min(22.1 * k, fitW / (textWidth(line3, 'sans600', 1, 0.108) || 1)))
  const textH = 1.08 * ws + 60 * k
  const motif = d.motif ? MOTIFS[d.motif] : undefined
  const motifMax = box.w * (l.kind === 'rect' || l.kind === 'none' ? 0.62 : 0.51)
  const m = motif ? Math.max(0, Math.min(motifMax, box.h - 64 - textH)) : 0
  const pad = (box.h - m - textH) / 2
  let y = box.y + pad
  let out = ''
  if (motif && m > 0) {
    const sc = m / 100
    out += `<g transform="translate(${n(300 - m / 2)} ${n(y)}) scale(${n(sc)})">${scopeIds(motif({ bg: l.bg, i: l.ink, a: l.a, a2: l.a2 }, n(4.2 / sc)), uid)}</g>`
    y += m
  }
  const wordY = y + 1.08 * ws
  out += `<text x="300" y="${n(wordY)}" text-anchor="middle" font-family="${font.family}" font-weight="${font.weight}" font-size="${ws}" fill="${l.ink}" letter-spacing="${n(font.spacing * ws)}">${escapeXml(word)}</text>`
  out += `<text x="300" y="${n(wordY + 32 * k)}" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="${rs}" fill="${l.ink}" letter-spacing="${n(0.12 * rs)}">${escapeXml(region)}</text>`
  out += `<text x="300" y="${n(wordY + 60 * k)}" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="${bs}" fill="${l.a}" letter-spacing="${n(0.108 * bs)}">${escapeXml(line3)}</text>`
  return out
}

function labelFrame(d: BottleDesign, box: Box): { shape: string; inset: number } {
  const l = d.label
  const stroke = `stroke="${INK}" stroke-width="5.60"`
  const { x, y, w, h } = box
  const x1 = n(x + w)
  const y1 = n(y + h)
  if (l.kind === 'oval') {
    const e = (inset: number, attrs: string) => `<ellipse cx="300" cy="${n(y + h / 2)}" rx="${n(w / 2 - inset)}" ry="${n(h / 2 - inset)}" ${attrs}/>`
    return { shape: e(0, `fill="${l.bg}" ${stroke}`) + (l.frame ? e(12, `fill="none" stroke="${l.a}" stroke-width="3.5"`) : ''), inset: 0.72 }
  }
  if (l.kind === 'shield') {
    const p = (i: number) =>
      `M${n(x + i)} ${n(y + i)}H${n(x1 - i)}V${n(y + 0.7 * h)}Q${n(x1 - i)} ${n(y + 0.91 * h - i)} 300 ${n(y1 - i * 1.6)}Q${n(x + i)} ${n(y + 0.91 * h - i)} ${n(x + i)} ${n(y + 0.7 * h)}Z`
    return {
      shape: `<path d="${p(0)}" fill="${l.bg}" ${stroke} stroke-linejoin="round"/>` + (l.frame ? `<path d="${p(12)}" fill="none" stroke="${l.a}" stroke-width="3.5" stroke-linejoin="round"/>` : ''),
      inset: 0.74,
    }
  }
  return {
    shape:
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${l.bg}" ${stroke}/>` +
      (l.frame ? `<rect x="${n(x + 12)}" y="${n(y + 12)}" width="${n(w - 24)}" height="${n(h - 24)}" rx="6" fill="none" stroke="${l.a}" stroke-width="3.5"/>` : ''),
    inset: 0.82,
  }
}

// ------------------------------------------------------------ closures -----

/** Shadow silhouettes of ring + cap/stopper (the visible parts are drawn in `closureFront`). */
function closureShadow(s: ShapeDef, d: BottleDesign, swing: boolean): string {
  const nw = 600 - 2 * s.nx0
  const ring = `<rect x="${s.nx0 - 7}" y="${s.top + (swing ? 16 : 0)}" width="${nw + 14}" height="24" rx="8"/>`
  if (swing) return ring + `<rect x="${s.nx0 + 4}" y="${s.top - 36}" width="${nw - 8}" height="46" rx="16"/>`
  if (d.closure === 'lime') return ring
  return ring + `<rect x="${s.nx0 - 9}" y="${s.top - 36}" width="${nw + 18}" height="40" rx="7"/>`
}

// ------------------------------------------------------------- render ------

export function renderBottle(input: RenderInput): string {
  const { design: d } = input
  const uid = input.uid.replace(/[^a-zA-Z0-9_-]/g, '')
  const t = timings(input.seed)
  const still = input.still === true
  const g = (x: string) => !still && d.gestures.includes(x as never)
  const clip = `c${uid}`
  const isCan = d.shape === 'can'
  const s = isCan ? null : SHAPES[d.shape as Exclude<typeof d.shape, 'can'>]
  const light = d.clear || luminance(d.glass) > 0.35
  const ink = light ? INK : CREAM
  const swing = d.closure === 'swing'

  // body gesture: one at a time, the first that is set wins
  let rootAnim = ''
  if (g('sway')) rootAnim = anim('rotate', '-2.5 300 1188;2.5 300 1188;-2.5 300 1188', '0;.5;1', t.sway, true)
  else if (g('nod')) rootAnim = anim('rotate', '0 300 1188;0 300 1188;2.5 300 1188;0 300 1188;2.5 300 1188;0 300 1188', '0;.5;.6;.7;.8;1', t.nod)
  else if (g('hop')) rootAnim = anim('translate', '0 0;0 0;0 -30;0 0;0 -10;0 0', '0;.6;.7;.8;.88;1', t.hop)
  else if (g('wobble')) rootAnim = anim('rotate', '-5 300 1188;4 300 1188;-3 300 1188;6 300 1188;-5 300 1188', '0;.25;.5;.75;1', t.wobble, true)

  let back = ''
  let body = ''
  let front = ''
  let faceY: number
  let faceScale: number

  if (isCan) {
    faceY = CAN.faceY
    faceScale = CAN.faceScale
    back += `<g transform="translate(${SHADOW} 0)" fill="${INK}"><path d="${CAN.body}"/><rect x="266" y="522" width="68" height="24" rx="12"/></g>`
    back += `<rect x="266" y="522" width="68" height="24" rx="12" fill="#C9CCC6" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>`
    body += `<path d="${CAN.body}" fill="${d.label.bg}" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>`
    body += `<g clip-path="url(#${clip})">${labelBlock(d, { x: 172, y: 760, w: 256, h: 350 }, input.abv, 0.82, uid)}<rect x="198" y="600" width="16" height="520" rx="8" fill="#fff" opacity=".22"/></g>`
    front += `<path d="${CAN.lid}" fill="#C9CCC6" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/><path d="${CAN.base}" fill="#C9CCC6" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>`
  } else {
    const sh = s!
    faceY = sh.faceY
    faceScale = sh.faceScale
    const path = bodyPath(sh, { bulge: d.bulge, waist: d.waist, swing })
    const top = sh.top + (swing ? 16 : 0)
    const nw = 600 - 2 * sh.nx0
    if (d.extra === 'smoke')
      back += `<path transform="translate(0 ${sh.top - 216})" d="M292 166C262 120 322 88 290 30C268 -10 300 -40 286 -70M316 150C340 110 300 70 328 20" stroke="${CREAM}" stroke-width="11.20" stroke-linecap="round" fill="none" opacity=".7"/>`
    back += `<g transform="translate(${SHADOW} 0)" fill="${INK}"><path d="${path}"/>${closureShadow(sh, d, swing)}</g>`
    const hlOpacity = d.clear ? 0.7 : 0.26
    const neckHl = Math.max(40, sh.neckBase - top - 80)
    body += `<path d="${path}" fill="${d.clear ? '#F4F7EE' : d.glass}" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>`
    body +=
      `<g clip-path="url(#${clip})">` +
      (d.clear ? `<rect x="0" y="${sh.neckBase + 70}" width="600" height="${FLOOR}" fill="${isHex(input.beer) ? input.beer : '#E6C150'}"/><path d="M0 ${sh.neckBase + 70}H600" stroke="${INK}" stroke-width="4.2"/>` : '') +
      `<rect x="${sh.x0 + 22}" y="${sh.shoulder + 10}" width="18" height="${FLOOR - 60 - sh.shoulder - 10}" rx="9" fill="#fff" opacity="${hlOpacity}"/>` +
      `<rect x="${sh.nx0 + 10}" y="${top + 40}" width="10" height="${neckHl}" rx="5" fill="#fff" opacity="${hlOpacity}"/></g>`
    body += `<path d="${path}" fill="none" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>`
    if (d.neckLabel && hasNeckRoom(sh)) {
      const y = sh.neckBase - 130
      body +=
        `<rect x="${sh.nx0 - 3}" y="${y}" width="${nw + 6}" height="84" rx="6" fill="${d.neckLabel.bg}" stroke="${INK}" stroke-width="5.60"/>` +
        `<path d="M${sh.nx0} ${y + 42}H${600 - sh.nx0}" stroke="${d.neckLabel.a}" stroke-width="7.70"/>` +
        `<circle cx="300" cy="${y + 42}" r="10.5" fill="${d.neckLabel.a}" stroke="${INK}" stroke-width="3.5"/>`
    }
    if (d.label.kind !== 'none') {
      const box = labelBox(sh)
      const frame = labelFrame(d, box)
      body += frame.shape + labelBlock(d, box, input.abv, frame.inset, uid)
    } else {
      body += labelBlock(d, labelBox(sh), input.abv, 0.82, uid)
    }
    front += closureFront(sh, d, swing, top, nw, still ? null : t.plopp, g('plopp'))
    if (d.extra === 'goat') front += goat(sh, d, still ? null : t.goat)
  }

  const face = renderFace({ eyes: d.eyes, brows: d.brows, mouth: d.mouth, acc: d.acc, gestures: d.gestures, ink, lid: d.glass, timing: t.face, still })
  const head = headPieces(d, isCan ? 540 : s!.top - 36, s)
  const clipPath = isCan ? CAN.body : bodyPath(s!, { bulge: d.bulge, waist: d.waist, swing })

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1200" width="100%" height="100%"><defs><clipPath id="${clip}"><path d="${clipPath}"/></clipPath></defs>` +
    `<g>${rootAnim}${back}${body}<g transform="translate(300 ${faceY}) scale(${faceScale})">${face}</g>${front}${head}</g></svg>`
  )
}

function closureFront(s: ShapeDef, d: BottleDesign, swing: boolean, top: number, nw: number, plopp: [number, number] | null, ploppOn: boolean): string {
  const nx0 = s.nx0
  const stroke = `stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"`
  const ring = `<rect x="${nx0 - 7}" y="${top}" width="${nw + 14}" height="24" rx="8" fill="${d.clear ? '#F4F7EE' : d.glass}" ${stroke}/>`
  if (d.closure === 'lime') {
    const y = top + 4
    return (
      ring +
      `<g transform="rotate(-14 300 ${y})"><path d="M234 ${y}A66 66 0 0 1 366 ${y}Z" fill="#7DBB3C" ${stroke}/>` +
      `<path d="M245 ${y}A55 55 0 0 1 355 ${y}Z" fill="#D5EC9A"/>` +
      `<path d="M300 ${y}V${y - 54}M300 ${y}L260.4 ${n(y - 36.3)}M300 ${y}L339.6 ${n(y - 36.3)}" stroke="#7DBB3C" stroke-width="4.2"/></g>`
    )
  }
  if (swing) {
    const t0 = s.top
    const lever = plopp && ploppOn ? anim('rotate', `0 ${600 - nx0 - 6} ${t0 - 6};0 ${600 - nx0 - 6} ${t0 - 6};-70 ${600 - nx0 - 6} ${t0 - 6};-70 ${600 - nx0 - 6} ${t0 - 6};0 ${600 - nx0 - 6} ${t0 - 6}`, '0;.7;.73;.86;1', plopp) : ''
    const word =
      plopp && ploppOn
        ? `<text x="${nx0 - 40}" y="${t0 - 66}" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="44" fill="${CREAM}" stroke="${INK}" stroke-width="5.60" paint-order="stroke" opacity="0" transform="rotate(-12 ${nx0 - 40} ${t0 - 66})">Plopp!<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.72;.74;.84;.88;1" dur="${plopp[0].toFixed(2)}s" begin="${plopp[1].toFixed(1)}s" repeatCount="indefinite"/></text>`
        : ''
    return (
      ring +
      `<path d="M${nx0 - 4} ${t0 - 14}L${nx0 - 14} ${t0 + 112}M${600 - nx0 + 4} ${t0 - 14}L${600 - nx0 + 14} ${t0 + 112}" stroke="${INK}" stroke-width="5.60" stroke-linecap="round"/>` +
      `<g>${lever}<rect x="${nx0 + 4}" y="${t0 - 36}" width="${nw - 8}" height="46" rx="16" fill="${CREAM}" ${stroke}/>` +
      `<path d="M${nx0 + 8} ${t0 + 10}H${600 - nx0 - 8}" stroke="#C4302B" stroke-width="7.70"/></g>` +
      word +
      `<rect x="${nx0 - 18}" y="${t0 + 102}" width="${nw + 36}" height="20" rx="10" fill="#C9CCC6" ${stroke}/>`
    )
  }
  let ridges = ''
  for (let i = 0; i < 6; i++) {
    const x = n(nx0 - 1 + (i * (nw + 2)) / 5)
    ridges += `<path d="M${x} ${top - 10}V${top + 4}" stroke="${INK}" stroke-width="3.5"/>`
  }
  return ring + `<rect x="${nx0 - 9}" y="${top - 36}" width="${nw + 18}" height="40" rx="7" fill="${d.cap}" ${stroke}/>` + ridges
}

/** Goat on a ribbon, hanging from the neck and swinging (Bock beers). */
function goat(s: ShapeDef, d: BottleDesign, t: [number, number] | null): string {
  const px = 600 - s.nx0
  const py = s.top + 25
  const swingAnim = t ? anim('rotate', `-8 ${px} ${py};8 ${px} ${py};-8 ${px} ${py}`, '0;.5;1', t, true) : ''
  const sk = `stroke="${INK}" stroke-width="4.89"`
  return (
    `<g>${swingAnim}<path d="M${px - 2} ${py}Q${px + 20} ${py + 10} ${px + 30} ${py + 40}" stroke="${d.cap}" stroke-width="4.89" fill="none"/>` +
    `<g transform="translate(${px + 6} ${py + 30}) scale(1.05)">` +
    `<path d="M40 68V88M52 68V88M66 68V88M76 66V86" ${sk} stroke-linecap="round"/>` +
    `<rect x="34" y="46" width="50" height="26" rx="13" fill="${CREAM}" ${sk}/><path d="M84 54L92 48" ${sk} stroke-linecap="round"/>` +
    `<circle cx="28" cy="42" r="13" fill="${CREAM}" ${sk}/>` +
    `<path d="M24 30Q16 14 30 10M32 30Q34 16 44 16" stroke="${CREAM}" stroke-width="6.36" fill="none" stroke-linecap="round"/>` +
    `<path d="M22 54L20 64" ${sk} stroke-linecap="round"/><circle cx="24" cy="40" r="2.4" fill="${INK}"/></g></g>`
  )
}

/** Pieces on top of the bottle/can: crown, mohawk, sailor cap; bow tie at the neck. */
function headPieces(d: BottleDesign, headY: number, s: ShapeDef | null): string {
  let out = ''
  const stroke = `stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"`
  if (d.acc.includes('crown'))
    out += `<g transform="rotate(-10 300 ${headY}) translate(0 ${headY - 66})"><path d="M274 68L268 36L286 50L300 28L314 50L332 36L326 68Z" fill="#F2B53A" stroke="${INK}" stroke-width="5.60" stroke-linejoin="round"/></g>`
  if (d.acc.includes('mohawk'))
    out += `<g transform="translate(0 ${headY - 540})"><path d="M234 556L240 506L258 540L270 486L286 536L300 478L314 536L330 486L342 540L360 506L366 556Z" fill="${d.label.a}" ${stroke}/></g>`
  if (d.acc.includes('sailor'))
    out +=
      `<g transform="translate(0 ${headY - 540}) rotate(-8 300 530)"><path d="M204 536Q204 506 232 500Q300 468 368 500Q396 506 396 536Z" fill="${CREAM}" ${stroke}/>` +
      `<rect x="200" y="524" width="200" height="20" rx="10" fill="#1E3F8A" ${stroke}/></g>`
  if (d.acc.includes('bowtie') && s)
    out += `<g transform="translate(300 ${s.neckBase + 34})"><path d="M0 0L-28 -15V15ZM0 0L28 -15V15Z" fill="${d.label.a}" ${stroke}/><circle r="7" fill="${d.label.a}" ${stroke}/></g>`
  return out
}

