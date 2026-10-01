/**
 * Bottle outlines on the shared 600 × 1200 canvas (floor y = 1188, centre x = 300), measured from the
 * designed bottles (Claude Design generator). Every shape is one parametric path plus layout anchors,
 * so thousands of beers share seven templates.
 */

export type ShapeKey = 'longneck' | 'longneck33' | 'euro' | 'nrw' | 'steinie' | 'vichy33' | 'can'

export interface ShapeDef {
  /** Left body edge; the right one mirrors around x = 300. */
  x0: number
  /** Corner radius at the floor. */
  r: number
  /** Where the straight body ends and the shoulder curve starts. */
  shoulder: number
  /** Shoulder curve: control point y at the body, control point y at the neck. */
  c1: number
  c2: number
  /** Left neck edge. */
  nx0: number
  /** Where the neck becomes straight. */
  neckBase: number
  /** Mouth of the bottle (crown cap sits above). */
  top: number
  /** Face centre and scale. */
  faceY: number
  faceScale: number
  /** Top edge of the label box; the box always ends at y = 1104. */
  labelTop: number
}

export const LABEL_BOTTOM = 1104
export const FLOOR = 1188

export const SHAPES: Record<Exclude<ShapeKey, 'can'>, ShapeDef> = {
  longneck: { x0: 164, r: 28, shoulder: 593, c1: 463.75, c2: 440.25, nx0: 252, neckBase: 358, top: 102, faceY: 668.55, faceScale: 1.07, labelTop: 752.74 },
  longneck33: { x0: 177, r: 26, shoulder: 656, c1: 540.5, c2: 519.5, nx0: 256, neckBase: 446, top: 221, faceY: 724.33, faceScale: 0.97, labelTop: 800.47 },
  euro: { x0: 155, r: 30, shoulder: 538, c1: 396.6, c2: 406.7, nx0: 244, neckBase: 336, top: 216, faceY: 618.5, faceScale: 1.15, labelTop: 708.2 },
  nrw: { x0: 158, r: 28, shoulder: 616, c1: 486.15, c2: 374.85, nx0: 250, neckBase: 245, top: 102, faceY: 694.88, faceScale: 1.12, labelTop: 782.79 },
  steinie: { x0: 154, r: 42, shoulder: 734, c1: 558.25, c2: 613.75, nx0: 253, neckBase: 549, top: 454, faceY: 756, faceScale: 0.88, labelTop: 812.32 },
  vichy33: { x0: 182, r: 26, shoulder: 670, c1: 586.6, c2: 489.3, nx0: 257, neckBase: 392, top: 265, faceY: 735.55, faceScale: 0.93, labelTop: 808.61 },
}

/** The can: fixed outline, face and text block straight on the body. */
export const CAN = {
  body: 'M160 580L178 540H422L440 580V1150L420 1188H180L160 1150Z',
  lid: 'M160 580L178 540H422L440 580Z',
  base: 'M160 1150H440L420 1188H180Z',
  faceY: 662,
  faceScale: 1.08,
  /** Text/motif block area on the body. */
  box: { x: 172, y: 600, w: 256, h: 540 },
}

const n = (v: number) => +v.toFixed(2)

export interface BodyOptions {
  /** Weißbier neck bulge (only on necks long enough for it). */
  bulge?: boolean
  /** Slight waist in the body. */
  waist?: boolean
  /** Swing tops sit 16 units lower so the stopper fits. */
  swing?: boolean
}

/** The body outline of a glass bottle, clockwise from the bottom left corner. */
export function bodyPath(s: ShapeDef, o: BodyOptions = {}): string {
  const x1 = 600 - s.x0
  const nx1 = 600 - s.nx0
  const top = s.top + (o.swing ? 16 : 0)
  const fl = FLOOR - s.r
  const mid = (s.shoulder + FLOOR) / 2
  const leftSide = o.waist ? `Q${s.x0 + 16} ${n(mid)} ${s.x0} ${s.shoulder}` : `L${s.x0} ${s.shoulder}`
  const rightSide = o.waist ? `Q${x1 - 16} ${n(mid)} ${x1} ${fl}` : `L${x1} ${fl}`
  // the bulge sits between top + 40 and top + 160 (Weißbier necks are long)
  const up = o.bulge
    ? `L${s.nx0} ${top + 160}C${s.nx0} ${top + 130} ${s.nx0 - 9} ${top + 125} ${s.nx0 - 9} ${top + 100}C${s.nx0 - 9} ${top + 75} ${s.nx0} ${top + 70} ${s.nx0} ${top + 40}L${s.nx0} ${top}`
    : `L${s.nx0} ${top}`
  const down = o.bulge
    ? `L${nx1} ${top + 40}C${nx1} ${top + 70} ${nx1 + 9} ${top + 75} ${nx1 + 9} ${top + 100}C${nx1 + 9} ${top + 125} ${nx1} ${top + 130} ${nx1} ${top + 160}L${nx1} ${s.neckBase}`
    : `L${nx1} ${s.neckBase}`
  return (
    `M${s.x0 + s.r} ${FLOOR}Q${s.x0} ${FLOOR} ${s.x0} ${fl}${leftSide}` +
    `C${s.x0} ${s.c1} ${s.nx0} ${s.c2} ${s.nx0} ${s.neckBase}${up}L${nx1} ${top}${down}` +
    `C${nx1} ${s.c2} ${x1} ${s.c1} ${x1} ${s.shoulder}${rightSide}Q${x1} ${FLOOR} ${x1 - s.r} ${FLOOR}Z`
  )
}

/** Label box (x, y, w, h): 90 % of the body width, from `labelTop` to y = 1104. */
export function labelBox(s: ShapeDef) {
  const w = (300 - s.x0) * 2 * 0.9
  return { x: n(300 - w / 2), y: s.labelTop, w: n(w), h: n(LABEL_BOTTOM - s.labelTop) }
}

/** A neck label needs a straight neck of at least 130 units. */
export const hasNeckRoom = (s: ShapeDef) => s.neckBase - s.top >= 200
