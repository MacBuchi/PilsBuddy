import { describe, expect, it } from 'vitest'
import { BOTTOM, clampView, clusterPoints, fitBounds, MAX_SCALE, minScale, project, TOP, toScreen, toWorld, unproject, viewAround, WORLD, zoomAt } from './worldMap'
import type { MapPoint, View } from './worldMap'

const PHONE = { w: 390, h: 700 }

describe('project', () => {
  it('maps the world onto the square, Greenwich/equator in the middle', () => {
    expect(project({ lat: 0, lon: 0 })).toEqual({ x: 500, y: 500 })
    expect(project({ lat: 0, lon: -180 }).x).toBe(0)
    expect(project({ lat: 0, lon: 180 }).x).toBe(WORLD)
    expect(project({ lat: 90, lon: 0 }).y).toBeCloseTo(0, 6)
  })

  it('round-trips through unproject', () => {
    for (const p of [{ lat: 49.2386, lon: 9.1016 }, { lat: -33.9, lon: 151.2 }, { lat: 64.1, lon: -21.9 }]) {
      const back = unproject(project(p))
      expect(back.lat).toBeCloseTo(p.lat, 9)
      expect(back.lon).toBeCloseTo(p.lon, 9)
    }
  })
})

describe('view', () => {
  it('cannot zoom out beyond a screen-filling map, nor in beyond MAX_SCALE', () => {
    expect(clampView({ x: 500, y: 500, scale: 0.01 }, PHONE).scale).toBe(minScale(PHONE))
    expect(clampView({ x: 500, y: 500, scale: 1e6 }, PHONE).scale).toBe(MAX_SCALE)
  })

  it('keeps the screen inside the map (78° N … 58° S)', () => {
    const v = clampView({ x: -50, y: 0, scale: 2 }, PHONE)
    expect(toWorld({ x: 0, y: 0 }, v, PHONE).x).toBeCloseTo(0, 9)
    expect(toWorld({ x: 0, y: 0 }, v, PHONE).y).toBeCloseTo(TOP, 9)
    const s = clampView({ x: 2000, y: 2000, scale: 2 }, PHONE)
    expect(toWorld({ x: PHONE.w, y: PHONE.h }, s, PHONE).y).toBeCloseTo(BOTTOM, 9)
  })

  it('zoomAt keeps the point under the finger in place', () => {
    const v: View = { x: 520, y: 330, scale: 20 }
    const at = { x: 100, y: 500 }
    const before = toWorld(at, v, PHONE)
    const after = toWorld(at, zoomAt(v, 2.5, at, PHONE), PHONE)
    expect(after.x).toBeCloseTo(before.x, 9)
    expect(after.y).toBeCloseTo(before.y, 9)
  })

  it('toScreen and toWorld are inverse', () => {
    const v: View = { x: 525.3, y: 337.1, scale: 87 }
    const s = toScreen({ x: 530, y: 340 }, v, PHONE)
    expect(toWorld(s, v, PHONE).x).toBeCloseTo(530, 9)
  })

  it('viewAround shows about the asked distance around the place', () => {
    const bad = { lat: 49.2386, lon: 9.1016 }
    const v = viewAround(bad, 100, PHONE)
    const edge = unproject(toWorld({ x: 0, y: PHONE.h / 2 }, v, PHONE))
    const km = (bad.lon - edge.lon) * 111.32 * Math.cos((bad.lat * Math.PI) / 180)
    expect(km).toBeGreaterThan(90)
    expect(km).toBeLessThan(110)
  })

  it('fitBounds shows the whole box', () => {
    const b = { x0: 500, y0: 300, x1: 540, y1: 340 }
    const v = fitBounds(b, PHONE)
    for (const p of [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y1 }]) {
      const s = toScreen(p, v, PHONE)
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThanOrEqual(PHONE.w)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeLessThanOrEqual(PHONE.h)
    }
  })
})

describe('clusterPoints', () => {
  const town = (id: string, lat: number, lon: number): MapPoint => ({ id, ...project({ lat, lon }) })
  const points = [
    town('a', 49.2386, 9.1016),
    town('b', 49.239, 9.102),
    town('c', 49.4954, 8.4823),
    town('d', 52.52, 13.405),
    town('e', 40.71, -74.0),
  ]

  it('melts close breweries into clusters and counts every visible one once', () => {
    const v = viewAround({ lat: 50, lon: 10 }, 600, PHONE)
    const m = clusterPoints(points, v, PHONE)
    const n = m.reduce((s, x) => s + (x.kind === 'many' ? x.n : 1), 0)
    expect(n).toBe(4) // New York is off screen
    expect(m.some((x) => x.kind === 'many' && x.n >= 2)).toBe(true)
  })

  it('shows every brewery alone at the closest zoom', () => {
    const v = clampView({ ...project({ lat: 49.2388, lon: 9.1018 }), scale: MAX_SCALE }, PHONE)
    const m = clusterPoints(points, v, PHONE)
    expect(m.map((x) => (x.kind === 'one' ? x.id : x.key)).sort()).toEqual(['a', 'b'])
  })

  it('is deterministic and independent of the input order', () => {
    const v = viewAround({ lat: 50, lon: 10 }, 600, PHONE)
    expect(clusterPoints([...points].reverse(), v, PHONE)).toEqual(clusterPoints(points, v, PHONE))
  })

  it('keeps clusters put while panning (grid anchored to the world)', () => {
    const v = viewAround({ lat: 50, lon: 10 }, 600, PHONE)
    const moved = { ...v, x: v.x + 3 / v.scale }
    const keys = (vv: View) => clusterPoints(points, vv, PHONE).map((x) => (x.kind === 'many' ? `${x.key}/${x.n}` : x.id))
    expect(keys(moved)).toEqual(keys(v))
  })

  it('gives a cluster the box of its members, so a tap can zoom to it', () => {
    const v = viewAround({ lat: 49.3, lon: 9 }, 200, PHONE)
    const c = clusterPoints(points, v, PHONE).find((x) => x.kind === 'many')
    expect(c?.kind === 'many' && c.box).toEqual({ x0: points[0].x, y0: points[1].y, x1: points[1].x, y1: points[0].y })
  })
})
