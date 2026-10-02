import { describe, expect, it } from 'vitest'
import { compatibility } from './matching'
import { cellBounds, cellOf, cellsWithin, formatKm, haversineKm, rankRegional, routeUrl } from './regional'
import { sanitizeBrewery, sourceUrl, toRegionalBeer } from './regionalBeer'
import type { RegionalBrewery } from './regionalBeer'
import { tasteFromStyle } from './styleProfile'
import type { TasteVector } from './types'

const RAPPENAU = { lat: 49.2386, lon: 9.1016 }
const HEILBRONN = { lat: 49.1427, lon: 9.2109 }

const brewery = (over: Partial<RegionalBrewery> & Pick<RegionalBrewery, 'id' | 'lat' | 'lon'>): RegionalBrewery => ({
  name: 'Brauerei ' + over.id,
  city: 'Testdorf',
  postcode: null,
  country: 'DE',
  website: null,
  founded: null,
  beers: [],
  ...over,
})
const beer = (id: string, style: string | null, abv: number | null = null) => ({ id, name: `Bier ${id}`, style, abv, pack: null, rank: 0, source: 1, source_ref: '4000000000001' })

describe('haversineKm', () => {
  it('measures real distances', () => {
    expect(haversineKm(RAPPENAU, HEILBRONN)).toBeCloseTo(13.4, 0)
    // Berlin → München ≈ 504 km
    expect(haversineKm({ lat: 52.52, lon: 13.405 }, { lat: 48.1374, lon: 11.5755 })).toBeCloseTo(504, -1)
    expect(haversineKm(RAPPENAU, RAPPENAU)).toBe(0)
  })
})

describe('grid cells', () => {
  it('names the 0.5° cell and its bounds', () => {
    expect(cellOf(RAPPENAU)).toBe('98:18')
    expect(cellBounds('98:18')).toEqual({ latMin: 49, latMax: 49.5, lonMin: 9, lonMax: 9.5 })
    expect(cellOf({ lat: -0.1, lon: -0.1 })).toBe('-1:-1')
  })

  it('covers the whole circle with whole cells', () => {
    for (const km of [10, 25, 50, 100]) {
      const cells = new Set(cellsWithin(RAPPENAU, km))
      // every point on the circle lies in one of the cells
      for (let deg = 0; deg < 360; deg += 5) {
        const a = (deg * Math.PI) / 180
        const p = { lat: RAPPENAU.lat + (km / 111.2) * Math.cos(a), lon: RAPPENAU.lon + (km / (111.2 * Math.cos((RAPPENAU.lat * Math.PI) / 180))) * Math.sin(a) }
        expect(cells.has(cellOf(p))).toBe(true)
      }
    }
    expect(cellsWithin(RAPPENAU, 10)).toEqual(['98:17', '98:18'])
    expect(cellsWithin(RAPPENAU, 100).length).toBeLessThanOrEqual(36)
  })
})

describe('sanitizeBrewery', () => {
  it('keeps a valid API row and sorts its beers by rank', () => {
    const b = sanitizeBrewery({
      id: 'osm-n1',
      name: 'Privatbrauerei Eichbaum',
      lat: 49.4954,
      lon: 8.4823,
      city: 'Mannheim',
      country: 'DE',
      website: 'https://eichbaum.de/',
      founded: 1679,
      regional_beers: [
        { id: 'r-22', name: 'Export', style: 'Export', abv: '5.4', pack: { ml: 500, swing: true, x: 1 }, rank: 1, source: 1, source_ref: '2' },
        { id: 'r-11', name: 'Ureich', style: 'Pils', abv: null, pack: null, rank: 0, source: 1, source_ref: '1' },
        { id: 'BAD id', name: 'x', rank: 0, source: 1 },
      ],
    })
    expect(b?.beers.map((r) => r.id)).toEqual(['r-11', 'r-22'])
    expect(b?.beers[1]).toMatchObject({ abv: 5.4, pack: { ml: 500, swing: true } })
  })

  it('rejects rows the app cannot place or link safely', () => {
    expect(sanitizeBrewery({ id: 'osm-n1', name: 'X', lat: 'a', lon: 8, country: 'DE' })).toBeNull()
    expect(sanitizeBrewery({ id: 'x', name: 'X', lat: 49, lon: 8, country: 'DE' })).toBeNull()
    expect(sanitizeBrewery({ id: 'osm-n1', name: 'X', lat: 49, lon: 8, country: 'FR' })).toBeNull()
    expect(sanitizeBrewery({ id: 'osm-n1', name: 'X', lat: 49, lon: 8, country: 'DE', website: 'javascript:alert(1)' })?.website).toBeNull()
  })

  it('takes Canadian and US breweries, also with an Open Brewery DB id (N4)', () => {
    const us = sanitizeBrewery({ id: 'obdb-5128df48-79fc-4f0f-8b52-d06be54d0cec', name: 'Sierra Nevada', lat: 39.72, lon: -121.82, country: 'US' })
    expect(us?.country).toBe('US')
    expect(sanitizeBrewery({ id: 'osm-n7', name: 'Unibroue', lat: 45.45, lon: -73.28, country: 'CA' })?.country).toBe('CA')
    expect(sanitizeBrewery({ id: 'obdb-123', name: 'X', lat: 1, lon: 1, country: 'US' })).toBeNull()
    expect(toRegionalBeer({ id: 'r-x1', name: 'Pale', style: 'Pale Ale', abv: 5.6, pack: null, rank: 0, source: 2, source_ref: 'Q1' }, us!).country).toBe('USA')
  })
})

describe('toRegionalBeer', () => {
  const b = brewery({ id: 'osm-n7', lat: 49, lon: 9, name: 'Löwenbräu Testdorf', founded: 1872, website: 'https://loewe.example/' })

  it('takes the taste only from the style estimate', () => {
    const x = toRegionalBeer({ ...beer('r-a1', 'Weißbier', 5.6), pack: { ml: 500 } }, b)
    expect(x.taste).toEqual(tasteFromStyle('Weißbier', 5.6))
    expect(x).toMatchObject({ style: 'Weißbier', abv: 5.6, brewery: 'Löwenbräu Testdorf', region: 'Testdorf', founded: 1872, pack: { ml: 500 } })
    expect(x.regional).toEqual({ breweryId: 'osm-n7', source: 'Open Food Facts', sourceUrl: 'https://world.openfoodfacts.org/product/4000000000001' })
  })

  it('an unknown style is honestly „Bier“ with a neutral estimate and the typical ABV', () => {
    const x = toRegionalBeer(beer('r-a2', 'Fantasie'), b)
    expect(x.style).toBe('Bier')
    expect(x.taste).toEqual(tasteFromStyle(null))
    expect(x.abv).toBe(5)
  })

  it('is deterministic', () => {
    expect(toRegionalBeer(beer('r-a3', 'Pils'), b)).toEqual(toRegionalBeer(beer('r-a3', 'Pils'), b))
  })

  it('links website beers to the page they were read from', () => {
    expect(sourceUrl({ ...beer('r-a4', 'Pils'), source: 3, source_ref: '/unsere-biere' }, b)).toBe('https://loewe.example/unsere-biere')
    expect(sourceUrl({ ...beer('r-a4', 'Pils'), source: 3, source_ref: '/x' }, { website: null })).toBeUndefined()
    expect(sourceUrl({ ...beer('r-a5', 'Pils'), source: 2, source_ref: 'Q501' }, b)).toBe('https://www.wikidata.org/wiki/Q501')
  })

  it('links reported beers (R6) to the link given with the report, if it is safe', () => {
    expect(sourceUrl({ ...beer('r-app37', 'Pils'), source: 5, source_ref: 'https://hinterhof.example/biere' }, b)).toBe('https://hinterhof.example/biere')
    expect(sourceUrl({ ...beer('r-app38', 'Pils'), source: 5, source_ref: 'javascript:alert(1)' }, b)).toBeUndefined()
    expect(sourceUrl({ ...beer('r-app39', 'Pils'), source: 5, source_ref: null }, b)).toBeUndefined()
    expect(toRegionalBeer({ ...beer('r-app37', 'Pils'), source: 5, source_ref: null }, b).regional?.source).toBe('Meldung aus der App')
  })

  it('accepts breweries reported in the app', () => {
    expect(sanitizeBrewery({ id: 'app-37', name: 'Hinterhofbräu', lat: 49.2, lon: 9.1, country: 'DE' })?.id).toBe('app-37')
    expect(sanitizeBrewery({ id: 'app-x', name: 'X', lat: 49.2, lon: 9.1, country: 'DE' })).toBeNull()
  })
})

describe('rankRegional', () => {
  const herb: TasteVector = { bitterness: 85, hopIntensity: 70, maltiness: 25, sweetness: 15, dryness: 80, body: 35, drinkability: 60, character: 70 }
  const list = [
    brewery({ id: 'osm-n1', ...HEILBRONN, beers: [beer('r-weizen', 'Weißbier'), beer('r-pils', 'Pils')] }),
    brewery({ id: 'osm-n2', lat: 49.24, lon: 9.11, beers: [beer('r-pils2', 'Pils')] }),
    brewery({ id: 'osm-n3', lat: 49.25, lon: 9.1 }),
    brewery({ id: 'osm-n4', lat: 48.5, lon: 9.1, beers: [beer('r-far', 'Pils')] }),
  ]

  it('ranks beers in the radius by match, ties by distance', () => {
    const r = rankRegional(herb, list, RAPPENAU, 25)
    expect(r.beers.map((h) => h.beer.id)).toEqual(['r-pils2', 'r-pils', 'r-weizen'])
    expect(r.beers[0].pct).toBe(compatibility(herb, tasteFromStyle('Pils')))
    expect(r.beers[0].km).toBeLessThan(1)
  })

  it('lists breweries without beers separately, nearest first, and drops what is outside', () => {
    const r = rankRegional(herb, list, RAPPENAU, 25)
    expect(r.breweries.map((h) => h.brewery.id)).toEqual(['osm-n3'])
    expect(rankRegional(herb, list, RAPPENAU, 100).beers.map((h) => h.beer.id)).toContain('r-far')
    expect(rankRegional(herb, list, RAPPENAU, 0.5).beers).toEqual([])
  })
})

describe('formatting', () => {
  it('formats distances the German way', () => {
    expect(formatKm(0.04)).toBe('100\u00a0m')
    expect(formatKm(0.84)).toBe('800\u00a0m')
    expect(formatKm(4.24)).toBe('4,2\u00a0km')
    expect(formatKm(37.4)).toBe('37\u00a0km')
  })

  it('the route link carries only the brewery position', () => {
    expect(routeUrl({ lat: 49.4954, lon: 8.4823 })).toBe('https://www.google.com/maps/dir/?api=1&destination=49.49540,8.48230')
  })
})
