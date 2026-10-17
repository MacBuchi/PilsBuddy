// World outline for the brewery map → src/data/world.ts
//   curl -sfLo /tmp/countries-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json
//   npm run map:build -- /tmp/countries-50m.json
// Natural Earth 1:50m (public domain) via world-atlas. Every arc is simplified once (Douglas–Peucker in projected
// units), so neighbouring countries keep a common edge. Output: LAND (filled polygons) and BORDERS (arcs shared by
// two countries) as compact SVG paths in tenths of a world unit – the screen scales them by 0.1.
/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BOTTOM, project, TOP, WORLD } from '../../src/domain/worldMap'
import type { Pt } from '../../src/domain/worldMap'

/** Tolerance in world units: 0.08 ≈ 2 km in Germany – coastlines stay recognisable at region zoom. */
const TOLERANCE = 0.08
const UNIT = 10

interface Topo {
  transform: { scale: [number, number]; translate: [number, number] }
  arcs: [number, number][][]
  objects: Record<string, { geometries: { type: string; arcs: number[][] | number[][][] }[] }>
}

const src = process.argv[2]
if (!src) throw new Error('usage: map:build <countries-50m.json>')
const topo = JSON.parse(readFileSync(src, 'utf8')) as Topo
const [sx, sy] = topo.transform.scale
const [tx, ty] = topo.transform.translate

// delta-decoded, projected, simplified arcs
const arcs: Pt[][] = topo.arcs.map((arc) => {
  let x = 0
  let y = 0
  const pts = arc.map(([dx, dy]) => {
    x += dx
    y += dy
    return project({ lon: x * sx + tx, lat: y * sy + ty })
  })
  return simplify(pts, TOLERANCE)
})

function simplify(pts: Pt[], tol: number): Pt[] {
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

const arcPts = (i: number) => (i >= 0 ? arcs[i] : [...arcs[~i]].reverse())

function ring(ids: number[]): Pt[] {
  const out: Pt[] = []
  for (const id of ids) {
    const pts = arcPts(id)
    out.push(...(out.length ? pts.slice(1) : pts))
  }
  return out
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
function path(lines: Pt[][], close: boolean): string {
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

const polygonsOf = (name: string) =>
  topo.objects[name].geometries.flatMap((g) => (g.type === 'Polygon' ? [g.arcs as number[][]] : g.type === 'MultiPolygon' ? (g.arcs as number[][][]) : []))

const land = polygonsOf('land').flatMap((poly) => poly.map(ring))

// an arc used by two different countries is a land border
const users = new Map<number, Set<number>>()
topo.objects.countries.geometries.forEach((g, ci) => {
  const polys = g.type === 'Polygon' ? [g.arcs as number[][]] : g.type === 'MultiPolygon' ? (g.arcs as number[][][]) : []
  for (const poly of polys) for (const r of poly) for (const id of r) {
    const k = id >= 0 ? id : ~id
    if (!users.has(k)) users.set(k, new Set())
    users.get(k)!.add(ci)
  }
})
const borders = [...users.entries()].filter(([, s]) => s.size > 1).map(([k]) => arcs[k])

const LAND = path(land, true)
const BORDERS = path(borders, false)
const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', '..', 'src/data/world.ts')
writeFileSync(
  out,
  `// Generated by tools/map/build.ts – do not edit. Natural Earth 1:50m (public domain) via world-atlas.
// Web-Mercator, tenths of a world unit (WORLD = 1000 in src/domain/worldMap.ts).
export const LAND =
  '${LAND}'
export const BORDERS =
  '${BORDERS}'
`,
)
console.log(`world.ts: land ${(LAND.length / 1024).toFixed(0)} KB, borders ${(BORDERS.length / 1024).toFixed(0)} KB`)
