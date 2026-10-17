import { describe, expect, it } from 'vitest'
import { BOTTOM, clampView, clusterPoints, fitBounds, mapZoom, MAX_SCALE, minScale, pathsAt, placeLabels, project, regionsInView, TOP, toScreen, toWorld, unproject, viewAround, WORLD, zoomAt } from './worldMap'
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

describe('map detail (#113)', () => {
  const germany = viewAround({ lat: 51, lon: 10 }, 400, PHONE)
  const town = viewAround({ lat: 49.24, lon: 9.1 }, 20, PHONE)

  it('mapZoom follows the web-map convention (whole world on 256 px = 0)', () => {
    expect(mapZoom(256 / WORLD)).toBeCloseTo(0, 9)
    expect(mapZoom((256 / WORLD) * 2 ** 8)).toBeCloseTo(8, 9)
  })

  it('loads the region in view only when zoomed in', () => {
    expect(regionsInView(clampView({ x: 500, y: 400, scale: 0 }, PHONE), PHONE)).toEqual([])
    expect(regionsInView(germany, PHONE)).toEqual(['dach'])
    expect(regionsInView(viewAround({ lat: 40.7, lon: -74 }, 50, PHONE), PHONE)).toEqual(['na'])
    expect(regionsInView(viewAround({ lat: -33.9, lon: 151.2 }, 50, PHONE), PHONE)).toEqual([])
  })

  it('draws a path from its zoom on', () => {
    const paths = [[4, 'M0 0l1 1'], [7, 'M2 2l1 1'], [9, 'M3 3l1 1']] as const
    expect(pathsAt(paths, 7.5)).toEqual(['M0 0l1 1', 'M2 2l1 1'])
    expect(pathsAt(paths, 3)).toEqual([])
  })

  it('names places from their zoom on, inside the screen, bigger ones winning overlaps', () => {
    const at = (lat: number, lon: number) => {
      const p = project({ lat, lon })
      return [Math.round(p.x * 100), Math.round(p.y * 100)] as const
    }
    const places = [
      ['Stuttgart', ...at(48.78, 9.18), 5],
      ['Heilbronn', ...at(49.14, 9.22), 7],
      ['Neckarsulm', ...at(49.19, 9.22), 8],
      ['Berlin', ...at(52.52, 13.4), 3],
    ] as const
    expect(placeLabels(places, germany, PHONE).map((l) => l.name)).toEqual(['Stuttgart', 'Berlin'])
    const near = placeLabels(places, town, PHONE).map((l) => l.name)
    expect(near).toContain('Heilbronn')
    expect(near).not.toContain('Berlin')
    // a place 1 km from Heilbronn would overlap its label: the bigger place (listed first) keeps its name
    const crowded = [...places, ['Sontheim', ...at(49.13, 9.22), 7]] as const
    expect(placeLabels(crowded, town, PHONE).map((l) => l.name)).toEqual(placeLabels(places, town, PHONE).map((l) => l.name))
  })
})
