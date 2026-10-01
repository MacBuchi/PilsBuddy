/**
 * Grid cells and distances for the regional finder (Stufe R4). The user's position never leaves the
 * device: the client asks the backend for whole 0.5° cells and measures distances itself.
 */

/** Grid size in degrees (≈ 55 km north–south, ≈ 36 km east–west in Germany). */
export const CELL_DEG = 0.5

export const RADII = [10, 25, 50, 100] as const
export type Radius = (typeof RADII)[number]

export interface LatLon {
  lat: number
  lon: number
}

const EARTH_KM = 6371.0088
const KM_PER_DEG = (Math.PI * EARTH_KM) / 180
const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance in km. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Cell key „row:col“ – integer indices of the 0.5° grid (south-west corner = index × 0.5°). */
export function cellOf(p: LatLon): string {
  return `${Math.floor(p.lat / CELL_DEG)}:${Math.floor(p.lon / CELL_DEG)}`
}

export interface CellBounds {
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
}

export function cellBounds(key: string): CellBounds {
  const [r, c] = key.split(':').map(Number)
  return { latMin: r * CELL_DEG, latMax: (r + 1) * CELL_DEG, lonMin: c * CELL_DEG, lonMax: (c + 1) * CELL_DEG }
}

/** All cells touching the bounding box of the circle – a superset; the ranking filters by real distance. */
export function cellsWithin(p: LatLon, km: number): string[] {
  const dLat = km / KM_PER_DEG
  const latEdge = Math.min(89.9, Math.max(Math.abs(p.lat - dLat), Math.abs(p.lat + dLat)))
  const dLon = Math.min(180, km / (KM_PER_DEG * Math.cos(rad(latEdge))))
  const r0 = Math.floor((p.lat - dLat) / CELL_DEG)
  const r1 = Math.floor((p.lat + dLat) / CELL_DEG)
  const c0 = Math.floor((p.lon - dLon) / CELL_DEG)
  const c1 = Math.floor((p.lon + dLon) / CELL_DEG)
  const out: string[] = []
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(`${r}:${c}`)
  return out
}
