import type { LatLon } from './geo'

/**
 * The brewery world map: Web-Mercator projection, the visible window and marker clustering. Pure and
 * deterministic – the screen renders what comes out of here. World coordinates are a WORLD × WORLD square
 * (x east, y south); a view is the world point in the middle of the screen plus a scale in px per unit.
 */

export const WORLD = 1000
/** Web-Mercator cut-off – the square's top and bottom edge. */
export const MAX_LAT = 85.05112878
/** Closest zoom: ≈ 17 m per px in Germany, so the breweries of one town separate. */
export const MAX_SCALE = 1500
/** Marker size on screen: closer points than this melt into a cluster. */
export const CLUSTER_PX = 60

export interface Pt {
  x: number
  y: number
}

export interface Size {
  w: number
  h: number
}

export interface View extends Pt {
  scale: number
}

const rad = (d: number) => (d * Math.PI) / 180

export function project(p: LatLon): Pt {
  const lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, p.lat))
  const y = Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2))
  return { x: ((p.lon + 180) / 360) * WORLD, y: (0.5 - y / (2 * Math.PI)) * WORLD }
}

export function unproject(p: Pt): LatLon {
  const lat = (Math.atan(Math.sinh((0.5 - p.y / WORLD) * 2 * Math.PI)) * 180) / Math.PI
  return { lat, lon: (p.x / WORLD) * 360 - 180 }
}

/** The map's north and south edge (no brewery beyond): 78° N, 58° S – less polar ice on a phone. */
export const TOP = project({ lat: 78, lon: 0 }).y
export const BOTTOM = project({ lat: -58, lon: 0 }).y

/** The map fills the screen in both directions – no further zoom-out. */
export const minScale = (size: Size) => Math.max(size.w / WORLD, size.h / (BOTTOM - TOP))

/** Keep the scale in range and the screen inside the map. */
export function clampView(v: View, size: Size): View {
  const scale = Math.max(minScale(size), Math.min(MAX_SCALE, v.scale))
  const axis = (c: number, px: number, lo: number, hi: number) => {
    const half = px / 2 / scale
    return Math.max(lo + half, Math.min(hi - half, c))
  }
  return { x: axis(v.x, size.w, 0, WORLD), y: axis(v.y, size.h, TOP, BOTTOM), scale }
}

export function toScreen(p: Pt, v: View, size: Size): Pt {
  return { x: (p.x - v.x) * v.scale + size.w / 2, y: (p.y - v.y) * v.scale + size.h / 2 }
}

export function toWorld(s: Pt, v: View, size: Size): Pt {
  return { x: (s.x - size.w / 2) / v.scale + v.x, y: (s.y - size.h / 2) / v.scale + v.y }
}

/** Zoom by `factor` keeping the world point under the screen point `at` in place (wheel, pinch, buttons). */
export function zoomAt(v: View, factor: number, at: Pt, size: Size): View {
  const scale = Math.max(minScale(size), Math.min(MAX_SCALE, v.scale * factor))
  const w = toWorld(at, v, size)
  return clampView({ x: w.x - (at.x - size.w / 2) / scale, y: w.y - (at.y - size.h / 2) / scale, scale }, size)
}

export interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function boundsOf(points: readonly Pt[]): Bounds | null {
  if (!points.length) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of points) {
    x0 = Math.min(x0, p.x)
    y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x)
    y1 = Math.max(y1, p.y)
  }
  return { x0, y0, x1, y1 }
}

/** The view that shows the box with `pad` px around it – capped at `maxScale` (one point: as close as allowed). */
export function fitBounds(b: Bounds, size: Size, pad = 48, maxScale = MAX_SCALE): View {
  const w = Math.max(1, size.w - 2 * pad)
  const h = Math.max(1, size.h - 2 * pad)
  const scale = Math.min(maxScale, w / Math.max(b.x1 - b.x0, 1e-9), h / Math.max(b.y1 - b.y0, 1e-9))
  return clampView({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, scale }, size)
}

/** The view around a place showing about `km` in each direction (Mercator stretches with latitude). */
export function viewAround(p: LatLon, km: number, size: Size): View {
  const kmPerUnit = (40075 / WORLD) * Math.cos(rad(Math.max(-MAX_LAT, Math.min(MAX_LAT, p.lat))))
  const c = project(p)
  return clampView({ ...c, scale: Math.min(size.w, size.h) / 2 / (km / kmPerUnit) }, size)
}

export interface MapPoint extends Pt {
  id: string
}

export type Marker =
  | { kind: 'one'; id: string; x: number; y: number }
  /** x/y on screen (the members' centre), `box` in world units – a tap zooms to it. */
  | { kind: 'many'; key: string; n: number; x: number; y: number; box: Bounds }

/**
 * Markers for the visible window. The grid is anchored to the world, not the screen, so clusters stay put
 * while panning; at the closest zoom every brewery gets its own marker. Ordered by grid cell, then id.
 */
export function clusterPoints(points: readonly MapPoint[], v: View, size: Size, cellPx = CLUSTER_PX): Marker[] {
  const cell = cellPx / v.scale
  const tl = toWorld({ x: -cellPx, y: -cellPx }, v, size)
  const br = toWorld({ x: size.w + cellPx, y: size.h + cellPx }, v, size)
  const visible = points.filter((p) => p.x >= tl.x && p.x <= br.x && p.y >= tl.y && p.y <= br.y)
  const one = (p: MapPoint): Marker => ({ kind: 'one', id: p.id, ...toScreen(p, v, size) })
  if (v.scale >= MAX_SCALE) return [...visible].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id)).map(one)
  const groups = new Map<string, MapPoint[]>()
  for (const p of visible) {
    const key = `${Math.floor(p.y / cell)}:${Math.floor(p.x / cell)}`
    const g = groups.get(key)
    if (g) g.push(p)
    else groups.set(key, [p])
  }
  const keyed = [...groups.entries()].map(([key, g]) => {
    const [r, c] = key.split(':').map(Number)
    return { r, c, key, g }
  })
  keyed.sort((a, b) => a.r - b.r || a.c - b.c)
  return keyed.map(({ key, g }): Marker => {
    if (g.length === 1) return one(g[0])
    const sx = g.reduce((s, p) => s + p.x, 0) / g.length
    const sy = g.reduce((s, p) => s + p.y, 0) / g.length
    return { kind: 'many', key, n: g.length, ...toScreen({ x: sx, y: sy }, v, size), box: boundsOf(g)! }
  })
}
