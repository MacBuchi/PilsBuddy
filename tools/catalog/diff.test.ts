import { describe, expect, it } from 'vitest'
import { beerRow, breweryRow, catalogDiff, diffMarkdown, diffTsv } from './diff'
import type { BeerRow, BreweryRow } from './diff'
import type { Brewery, RegionalBeer } from './merge'

const br = (b: Partial<BreweryRow> & Pick<BreweryRow, 'id' | 'name'>): BreweryRow => ({
  lat: 49, lon: 9, city: null, postcode: null, country: 'DE', website: null, founded: null, ...b,
})
const beer = (b: Partial<BeerRow> & Pick<BeerRow, 'id' | 'breweryId' | 'name'>): BeerRow => ({
  style: null, abv: null, source: 1, ...b,
})

describe('catalogDiff', () => {
  const live = {
    breweries: [
      br({ id: 'osm-n1', name: 'Eichbaum', city: 'Mannheim' }),
      br({ id: 'osm-n2', name: 'Gone' }),
      br({ id: 'osm-n3', name: 'Moved' }),
      br({ id: 'app-12', name: 'Reported in the app' }),
      br({ id: 'obdb-x', name: 'Sierra Nevada', country: 'US', lat: 39.7, lon: -121.8 }),
    ],
    beers: [
      beer({ id: 'b1', breweryId: 'osm-n1', name: 'Ureich Pils', style: 'Pils', abv: 4.9 }),
      beer({ id: 'b2', breweryId: 'osm-n2', name: 'Gone Lager' }),
      beer({ id: 'b5', breweryId: 'osm-n1', name: 'Reported beer', source: 5 }),
      beer({ id: 'b9', breweryId: 'obdb-x', name: 'Pale Ale' }),
    ],
  }
  const next = {
    breweries: [
      br({ id: 'osm-n1', name: 'Eichbaum', city: 'Mannheim', lat: 49.0001 }),
      br({ id: 'osm-n3', name: 'Moved', lat: 49.05 }),
      br({ id: 'osm-n4', name: 'Neu' }),
      br({ id: 'obdb-x', name: 'Sierra Nevada', country: 'US', lat: 39.7, lon: -121.8 }),
    ],
    beers: [
      beer({ id: 'b1', breweryId: 'osm-n1', name: 'Ureich Pils', style: 'Pils', abv: 5.0 }),
      beer({ id: 'b4', breweryId: 'osm-n4', name: 'Neu Hell' }),
      beer({ id: 'b9', breweryId: 'obdb-x', name: 'Pale Ale' }),
    ],
  }
  const diff = catalogDiff(['DE', 'AT', 'US'], live, next)
  const de = diff.find((d) => d.country === 'DE')!

  it('splits new, gone and changed per country', () => {
    expect(de.breweries.added.map((b) => b.id)).toEqual(['osm-n4'])
    expect(de.breweries.removed.map((b) => b.id)).toEqual(['osm-n2'])
    expect(de.breweries.changed).toEqual([{ before: live.breweries[2], after: next.breweries[1], fields: ['Lage'] }])
    expect(de.beers.added.map((b) => b.id)).toEqual(['b4'])
    expect(de.beers.removed.map((b) => b.id)).toEqual(['b2'])
    expect(de.beers.changed.map((c) => [c.after.id, c.fields])).toEqual([['b1', ['Alkohol']]])
  })

  it('leaves out what was reported in the app – the import never takes it back', () => {
    expect(de.breweries.live).toBe(3)
    expect(de.beers.live).toBe(2)
    expect(diffTsv(diff)).not.toMatch(/app-12|\bb5\b/)
  })

  it('ignores a few metres of re-geocoding, keeps countries in order and unchanged ones empty', () => {
    expect(diff.map((d) => d.country)).toEqual(['DE', 'AT', 'US'])
    const us = diff.find((d) => d.country === 'US')!
    expect(us.breweries.changed).toEqual([])
    expect(us.beers).toMatchObject({ live: 1, next: 1, added: [], removed: [], changed: [] })
  })

  it('flags a country the import guard would stop (more than 10 % of its breweries gone)', () => {
    expect(de.blocked).toBe(false)
    const short = catalogDiff(['DE'], live, { breweries: [], beers: [] })
    expect(short[0].blocked).toBe(true)
    expect(diffMarkdown(short)).toContain('[!CAUTION]')
    // V12: breweries hidden on purpose are no short download
    expect(catalogDiff(['DE'], live, { breweries: [], beers: [], downloaded: { DE: 99 } })[0].blocked).toBe(false)
  })

  it('maps build rows to diff rows', () => {
    const b = { id: 'osm-n1', name: 'E', lat: 1, lon: 2, city: 'M', postcode: '1', country: 'DE', website: null, founded: 1679, sources: ['osm'], qid: 'Q1' } as Brewery
    expect(breweryRow(b)).toEqual({ id: 'osm-n1', name: 'E', lat: 1, lon: 2, city: 'M', postcode: '1', country: 'DE', website: null, founded: 1679 })
    const r = { id: 'x', breweryId: 'osm-n1', name: 'P', style: 'Pils', abv: 5, pack: null, rank: 1, source: 3, sourceRef: '/p' } as RegionalBeer
    expect(beerRow(r)).toEqual({ id: 'x', breweryId: 'osm-n1', name: 'P', style: 'Pils', abv: 5, source: 3 })
  })
})

describe('diffMarkdown', () => {
  it('summarises per country and lists samples, deterministic', () => {
    const live = { breweries: [br({ id: 'osm-n1', name: 'Alt' })], beers: [] }
    const next = {
      breweries: [br({ id: 'osm-n1', name: 'Neu | Name' }), ...['C', 'A', 'B'].map((n) => br({ id: `osm-${n}`, name: `Brauerei ${n}` }))],
      beers: [],
    }
    const md = diffMarkdown(catalogDiff(['DE', 'AT'], live, next), 2)
    expect(md).toContain('| DE | 1 → 4 (+3) | 3 | 0 | 1 | 0 → 0 (±0) | 0 | 0 | 0 |')
    expect(md).toContain('| AT | 0 → 0 (±0) |')
    expect(md).toContain('- **Brauereien neu** (3): Brauerei A `osm-A` · Brauerei B `osm-B` · …')
    expect(md).toContain('- **Brauereien geändert** (1): Neu \\| Name `osm-n1` – Name (vorher „Alt“)')
    expect(md).not.toContain('### AT')
    expect(diffMarkdown(catalogDiff(['DE', 'AT'], live, next), 2)).toBe(md)
  })

  it('stays inside a PR body for a big month', () => {
    const many = (n: number, p: string) => Array.from({ length: n }, (_, i) => br({ id: `${p}-${i}`, name: `${p} ${'x'.repeat(80)} ${i}` }))
    const md = diffMarkdown(catalogDiff(['DE'], { breweries: many(5000, 'old'), beers: [] }, { breweries: many(5000, 'new'), beers: [] }))
    expect(md.length).toBeLessThan(10_000)
  })
})
