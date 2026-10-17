// Map detail for the brewery map (#113) → src/data/detail/<region>.ts, one lazy chunk per region (DACH ≈ 50 KB gzip,
// North America ≈ 270 KB), loaded only when the user zooms into that region
//   for f in ne_10m_roads ne_10m_rivers_lake_centerlines ne_10m_rivers_europe ne_10m_rivers_north_america \
//     ne_10m_lakes ne_10m_lakes_europe ne_10m_lakes_north_america ne_10m_populated_places; do
//     curl -sfLo /tmp/ne/$f.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/$f.geojson
//   done
//   npm run map:detail -- /tmp/ne
// Natural Earth 1:10m (public domain), only around the catalogue countries. Lines and lakes are grouped by the
// zoom level Natural Earth gives them (`min_zoom`), so the screen draws what fits the zoom; places keep their
// own `min_zoom` for the labels.
/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DETAIL_REGIONS, project } from '../../src/domain/worldMap'
import type { DetailRegion } from '../../src/domain/worldMap'
import type { Pt } from '../../src/domain/worldMap'
import { path, simplify } from './geom'

/** Tolerance in world units: 0.01 ≈ 250 m in Germany; North America is wide and its chunk large – 0.03 there. */
const TOLERANCE: Record<DetailRegion['id'], number> = { dach: 0.01, na: 0.03 }
/** Below this zoom the outline alone is enough (Natural Earth zoom: 0 = whole world on 256 px). */
const FIRST_ZOOM = 4
/** Natural Earth zooms beyond this are drawn at this zoom already – the closest detail it has. */
const LAST_ZOOM = 9

type Pos = [number, number]
interface Feature {
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: unknown } | null
}

const dir = process.argv[2]
if (!dir) throw new Error('usage: map:detail <folder with the Natural Earth geojson files>')
const read = (name: string) => (JSON.parse(readFileSync(join(dir, `${name}.geojson`), 'utf8')) as { features: Feature[] }).features

const inRegion = (lines: Pos[][], r: DetailRegion) => lines.some((l) => l.some(([lon, lat]) => lon >= r.w && lon <= r.e && lat >= r.s && lat <= r.n))

/** Lines (or polygon rings) of a feature, lon/lat. */
function linesOf(f: Feature): Pos[][] {
  const g = f.geometry
  if (!g) return []
  if (g.type === 'LineString') return [g.coordinates as Pos[]]
  if (g.type === 'MultiLineString' || g.type === 'Polygon') return g.coordinates as Pos[][]
  if (g.type === 'MultiPolygon') return (g.coordinates as Pos[][][]).flat()
  return []
}

const zoomOf = (f: Feature) => {
  const z = Math.round(Number(f.properties.min_zoom ?? f.properties.scalerank ?? LAST_ZOOM))
  return Math.max(FIRST_ZOOM, Math.min(LAST_ZOOM, Number.isFinite(z) ? z : LAST_ZOOM))
}

/** Features grouped by zoom → one compact path per zoom, smallest zoom first. */
function layer(r: DetailRegion, features: Feature[], close: boolean, keep: (f: Feature) => boolean = () => true): [number, string][] {
  const byZoom = new Map<number, Pt[][]>()
  for (const f of features) {
    const lines = linesOf(f)
    if (!inRegion(lines, r) || !keep(f)) continue
    const pts = lines.map((l) => simplify(l.map(([lon, lat]) => project({ lon, lat })), TOLERANCE[r.id]))
    const z = zoomOf(f)
    byZoom.set(z, [...(byZoom.get(z) ?? []), ...pts])
  }
  return [...byZoom.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([z, lines]): [number, string] => [z, path(lines, close)])
    .filter(([, d]) => d)
}

const rivers = [...read('ne_10m_rivers_lake_centerlines'), ...read('ne_10m_rivers_europe'), ...read('ne_10m_rivers_north_america')]
const lakes = [...read('ne_10m_lakes'), ...read('ne_10m_lakes_europe'), ...read('ne_10m_lakes_north_america')]
const roads = read('ne_10m_roads')
// the full places file has the German names (Hannover, München, Genf) – the map names DACH in German
const places = read('ne_10m_populated_places')
const here = dirname(fileURLToPath(import.meta.url))
const json = (v: unknown) => JSON.stringify(v)
const kb = (s: string) => `${(s.length / 1024).toFixed(0)} KB`

for (const r of DETAIL_REGIONS) {
  // a river in both the world and the regional file appears once (same name, zoom and start)
  const seen = new Set<string>()
  const RIVERS = layer(r, rivers, false, (f) => {
    if (f.properties.featurecla !== 'River' && f.properties.featurecla !== 'Lake Centerline') return false
    const key = `${f.properties.name}|${zoomOf(f)}|${JSON.stringify(linesOf(f)[0]?.[0])}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const LAKES = layer(r, lakes, true)
  // ferries and tracks are no help for finding a brewery
  const ROADS = layer(r, roads, false, (f) => f.properties.type !== 'Ferry Route' && f.properties.type !== 'Track')
  // places: name, world position (hundredths of a unit), zoom from which the label shows – bigger places first,
  // they win where labels would overlap
  const PLACES = places
    .filter((f) => r.countries.includes(String(f.properties.ISO_A2)))
    .map((f) => {
      const q = f.properties
      const p = project({ lat: Number(q.LATITUDE), lon: Number(q.LONGITUDE) })
      const z = Math.max(2, Math.round(Number(q.MIN_ZOOM) || LAST_ZOOM))
      const name = String((r.id === 'dach' && q.NAME_DE) || q.NAME)
      return { row: [name, Math.round(p.x * 100), Math.round(p.y * 100), z] as const, pop: Number(q.POP_MAX) || 0 }
    })
    .sort((a, b) => a.row[3] - b.row[3] || b.pop - a.pop || a.row[0].localeCompare(b.row[0]))
    .map((p) => p.row)

  writeFileSync(
    join(here, '..', '..', `src/data/detail/${r.id}.ts`),
    `// Generated by tools/map/detail.ts – do not edit. Natural Earth 1:10m (public domain), region ${r.id}.
// Paths: Web-Mercator, tenths of a world unit, per Natural Earth zoom; places: [name, x, y in hundredths, zoom].
import type { MapDetail } from '../../domain/worldMap'

const detail: MapDetail = {
  rivers: ${json(RIVERS)},
  lakes: ${json(LAKES)},
  roads: ${json(ROADS)},
  places: ${json(PLACES)},
}
export default detail
`,
  )
  console.log(`detail/${r.id}.ts: rivers ${kb(json(RIVERS))}, lakes ${kb(json(LAKES))}, roads ${kb(json(ROADS))}, places ${PLACES.length}`)
}
