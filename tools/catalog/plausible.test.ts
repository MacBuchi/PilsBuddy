import { describe, expect, it } from 'vitest'
import { ABV_RANGE, STYLE_PROFILES } from '../../src/domain/styleProfile'
import { mainBeers, notABeerName } from './merge'
import type { Brewery } from './merge'
import { checkAbv, plausibilityReport } from './plausible'
import type { PlausibilityNote } from './plausible'

const brewery = (b: Partial<Brewery> & Pick<Brewery, 'id' | 'name'>): Brewery => ({
  lat: 49, lon: 9, city: null, postcode: null, country: 'DE', website: null, founded: null, sources: ['osm'], qid: null, ...b,
})

describe('ABV_RANGE', () => {
  it('covers every style, each range holds the style’s typical ABV', () => {
    expect(Object.keys(ABV_RANGE).sort()).toEqual(Object.keys(STYLE_PROFILES).sort())
    for (const [style, [min, max]] of Object.entries(ABV_RANGE)) {
      expect(min, style).toBeLessThan(max)
      expect(STYLE_PROFILES[style].abv, style).toBeGreaterThanOrEqual(min)
      expect(STYLE_PROFILES[style].abv, style).toBeLessThanOrEqual(max)
    }
  })
})

describe('checkAbv (V5)', () => {
  it('drops the reading errors found in the live catalogue (2026-10-13)', () => {
    expect(checkAbv('Bock', 17.5)).toEqual({ abv: null, flag: 'abv-plato' }) // „Maibock“
    expect(checkAbv('Bock', 16)).toEqual({ abv: null, flag: 'abv-plato' }) // „Mai Bock“
    expect(checkAbv('Helles', 1)).toEqual({ abv: null, flag: 'abv-size' }) // „Allgäuer Hell“
    expect(checkAbv('Lager', 1)).toEqual({ abv: null, flag: 'abv-size' }) // „La Festi Valoise“
    expect(checkAbv('IPA', 2.4)).toEqual({ abv: null, flag: 'abv-range' }) // „Betty IPA“
    expect(checkAbv('IPA', 2)).toEqual({ abv: null, flag: 'abv-size' }) // „Black IPA“ – 2,0 is the 2-l growler as often
    expect(checkAbv('Alkoholfrei', 5)).toEqual({ abv: null, flag: 'abv-range' }) // „Non-Alcoholic Offerings“
  })

  it('keeps strong and light beers that really exist', () => {
    for (const [style, abv] of [
      ['Imperial Stout', 13],
      ['Imperial Stout', 15.5],
      ['Stout', 12],
      ['Barleywine', 14.4],
      ['Doppelbock', 12],
      ['IPA', 8.5],
      ['Weißbier', 2.9], // „Leichtes Weizen“
      ['Alkoholfrei', 0.4],
      ['Radler', 2.5],
    ] as const)
      expect(checkAbv(style, abv), `${style} ${abv}`).toEqual({ abv, flag: null })
  })

  it('leaves unknown styles and missing ABV alone', () => {
    expect(checkAbv(null, 17)).toEqual({ abv: 17, flag: null })
    expect(checkAbv('Pils', null)).toEqual({ abv: null, flag: null })
  })
})

describe('mainBeers with plausibility (V5)', () => {
  it('drops the ABV, keeps the beer, and reports it', () => {
    const notes: PlausibilityNote[] = []
    const beers = mainBeers([], [brewery({ id: 'osm-n4', name: 'Klosterbräu' })], [], [], [
      { breweryId: 'osm-n4', path: '/biere', name: 'Maibock', abv: 17.5 },
      { breweryId: 'osm-n4', path: '/biere', name: 'Kloster Pils', abv: 4.9 },
    ], notes)
    expect(beers.map((b) => [b.name, b.abv])).toEqual([['Kloster Pils', 4.9], ['Maibock', null]])
    expect(notes).toEqual([{ breweryId: 'osm-n4', name: 'Maibock', style: 'Bock', abv: 17.5, flag: 'abv-plato' }])
    const report = plausibilityReport(notes).join('\n')
    expect(report).toContain('Alkohol verworfen 1')
    expect(report).toContain('Maibock (Bock 17,5 %)')
  })

  it('a dropped ABV cannot be confirmed by a second source', () => {
    const beers = mainBeers(
      [],
      [brewery({ id: 'osm-n4', name: 'Hofbräu', qid: 'Q1' })],
      [{ id: 'wd:Q9', name: 'Hofbräu Maibock', brewery: 'wd:Q1', breweryName: 'Hofbräu', kinds: ['Bockbier'], abv: 7.2 }],
      [],
      [{ breweryId: 'osm-n4', path: '/', name: 'Hofbräu Maibock', abv: 16 }],
    )
    // Wikidata says 7,2, the website's 16 was original gravity → no contradiction left, but only one ABV source
    expect(beers.map((b) => [b.name, b.abv, b.quality])).toEqual([['Hofbräu Maibock', 7.2, 2]])
  })

  it('section headings are no beer', () => {
    for (const n of ['Non-Alcoholic Offerings', 'Unser Sortiment', 'Our Beers', 'Unsere Biere im Überblick'])
      expect(notABeerName(n), n).toBe(true)
    for (const n of ['Sortiment Pils', 'Beers & Cheers IPA', 'Our Town Lager'])
      expect(notABeerName(n), n).toBe(false)
  })
})
