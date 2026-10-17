// Shared geometry of the map builds (build.ts: outline, detail.ts: rivers, lakes, roads).
import { BOTTOM, TOP, WORLD } from '../../src/domain/worldMap'
import type { Pt } from '../../src/domain/worldMap'

/** Paths are stored in tenths of a world unit – the screen scales them by 0.1. */
const UNIT = 10

/** Douglas–Peucker in projected units. */
export function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    let best = -1
    let far = tol
    for (let i = a + 1; i < b; i++) {
      const d = distToSegment(pts[i], pts[a], pts[b])
      if (d > far) {
        far = d
        best = i
      }
    }
    if (best > 0) {
      keep[best] = 1
      stack.push([a, best], [best, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

/**
 * A few rings and arcs cross the antimeridian (Chukotka, Fiji): a step of more than half the world is really a
 * short step across the 180° line. Unwrap them into one continuous line (x may leave 0…WORLD) and add a copy
 * shifted by one world width, so both map edges show their part. Lines entirely beyond the map's north or
 * south edge (Antarctica, the far Arctic) are left out.
 */
function unwrap(lines: Pt[][]): Pt[][] {
  return lines.flatMap((line) => {
    if (line.every((p) => p.y > BOTTOM) || line.every((p) => p.y < TOP)) return []
    let shift = 0
    const out = line.map((p, i) => {
      const dx = i ? p.x - line[i - 1].x : 0
      if (dx > WORLD / 2) shift -= WORLD
      else if (dx < -WORLD / 2) shift += WORLD
      return { x: p.x + shift, y: p.y }
    })
    if (out.some((p) => p.x < 0)) return [out, out.map((p) => ({ x: p.x + WORLD, y: p.y }))]
    if (out.some((p) => p.x > WORLD)) return [out, out.map((p) => ({ x: p.x - WORLD, y: p.y }))]
    return [out]
  })
}

/** Compact path: absolute start, relative integer steps, repeated `l` dropped. */
export function path(lines: Pt[][], close: boolean): string {
  let d = ''
  for (const line of unwrap(lines)) {
    const q = line.map((p) => [Math.round(p.x * UNIT), Math.round(p.y * UNIT)])
    const steps: string[] = []
    for (let i = 1; i < q.length; i++) {
      const dx = q[i][0] - q[i - 1][0]
      const dy = q[i][1] - q[i - 1][1]
      if (dx || dy) steps.push(`${dx} ${dy}`.replace(/ -/g, '-'))
    }
    if (close ? steps.length < 2 : !steps.length) continue
    d += `M${q[0][0]} ${q[0][1]}l${steps.join(' ').replace(/ -/g, '-')}${close ? 'z' : ''}`
  }
  return d
}

