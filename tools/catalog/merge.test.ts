import { describe, expect, it } from 'vitest'
import {
  breweryMatcher,
  cleanBeerName,
  importSql,
  mainBeers,
  mergeBreweries,
  normName,
  parsePlaces,
  pickMainBeers,
} from './merge'
import type { Brewery, OffRow, OsmRow, WikidataRow } from './merge'

const osm = (o: Partial<OsmRow> & Pick<OsmRow, 'id' | 'name' | 'lat' | 'lon'>): OsmRow => ({
  city: null, postcode: null, country: null, website: null, ...o,
})
const wd = (w: Partial<WikidataRow> & Pick<WikidataRow, 'id' | 'name' | 'lat' | 'lon'>): WikidataRow => ({
  country: null, website: null, dissolved: false, ...w,
})
const off = (p: Partial<OffRow> & Pick<OffRow, 'code' | 'name'>): OffRow => ({
  brands: null, owner: null, places: null, abv: null, categories: [], labels: [], quantity: null, ...p,
})
const brewery = (b: Partial<Brewery> & Pick<Brewery, 'id' | 'name'>): Brewery => ({
  lat: 49, lon: 9, city: null, postcode: null, country: 'DE', website: null, founded: null, sources: ['osm'], ...b,
})

describe('normName', () => {
  it('drops legal forms, filler words and umlaut spellings', () => {
    expect(normName('Privatbrauerei Wittmann GmbH & Co. KG')).toBe('wittmann')
    expect(normName('Löwenbräu')).toBe(normName('Loewenbraeu'))
    expect(normName('Brauhaus zum Löwen')).toBe('loewen')
  })
})

describe('mergeBreweries', () => {
  const none = { DE: [], AT: [], CH: [] }
  it('collapses the same brewery mapped twice and merges Wikidata by tag or name + distance', () => {
    const merged = mergeBreweries(
      {
        DE: [
          osm({ id: 'osm:n1', name: 'Brauerei Hohenlohe', lat: 49.2, lon: 9.1, wikidata: 'Q10' }),
          osm({ id: 'osm:w2', name: 'Hohenlohe Brauerei GmbH', lat: 49.2005, lon: 9.1005 }),
          osm({ id: 'osm:n3', name: 'Adler', lat: 49.3, lon: 9.2, website: 'adler-bier.de' }),
          osm({ id: 'osm:n4', name: 'Adler', lat: 48.1, lon: 11.5 }),
          osm({ id: 'osm:n5', name: null, lat: 48, lon: 11 }),
        ],
        AT: [],
        CH: [],
      },
      {
        DE: [
          wd({ id: 'wd:Q10', name: 'Brauerei Hohenlohe', lat: 49.21, lon: 9.11, founded: 1849, city: 'Hohenlohe' }),
          wd({ id: 'wd:Q11', name: 'Adler-Bräu', lat: 49.3001, lon: 9.2001, website: 'https://adler.example' }),
          wd({ id: 'wd:Q12', name: 'Alte Brauerei', lat: 50, lon: 10, dissolved: true }),
          wd({ id: 'wd:Q13', name: 'Klosterbrauerei', lat: 50, lon: 10, founded: 1100 }),
        ],
        AT: [],
        CH: [],
      },
    )
    expect(merged.map((b) => b.id)).toEqual(['osm-n1', 'osm-n3', 'osm-n4', 'wd-q13'])
    const [hohenlohe, adler, adler2, kloster] = merged
    expect(hohenlohe).toMatchObject({ sources: ['osm', 'wikidata'], founded: 1849, city: 'Hohenlohe', country: 'DE' })
    // own website wins, a bare domain becomes a URL
    expect(adler).toMatchObject({ sources: ['osm', 'wikidata'], website: 'https://adler-bier.de' })
    expect(adler2.sources).toEqual(['osm'])
    expect(kloster).toMatchObject({ sources: ['wikidata'], founded: 1100 })
  })

  it('takes the country from the file when the address has none or a strange one', () => {
    const [b] = mergeBreweries({ ...none, AT: [osm({ id: 'osm:n1', name: 'Stiegl', lat: 47.8, lon: 13, country: 'at' })] }, none)
    expect(b.country).toBe('AT')
    const [c] = mergeBreweries({ ...none, CH: [osm({ id: 'osm:n2', name: 'Feldschlösschen', lat: 47.5, lon: 7.8, country: 'Schweiz' })] }, none)
    expect(c.country).toBe('CH')
  })
})

describe('breweryMatcher', () => {
  const breweries = [
    brewery({ id: 'osm-n1', name: 'Haller Löwenbräu', city: 'Schwäbisch Hall' }),
    brewery({ id: 'osm-n2', name: 'Brauerei Adler', city: 'Dettingen' }),
    brewery({ id: 'osm-n3', name: 'Adler Brauerei', city: 'Bonndorf' }),
    brewery({ id: 'osm-n4', name: 'Krombacher Brauerei', city: 'Kreuztal' }),
  ]
  const match = breweryMatcher(breweries)

  it('needs every name token of the brewery in the brand', () => {
    expect(match({ brands: 'Löwenbräu', owner: null, places: null })).toBeNull()
    expect(match({ brands: 'Haller Löwenbräu', owner: null, places: null })?.id).toBe('osm-n1')
    expect(match({ brands: 'Krombacher', owner: 'Krombacher Brauerei GmbH & Co. KG', places: null })?.id).toBe('osm-n4')
  })

  it('decides between same-named breweries by the manufacturing place, else not at all', () => {
    expect(match({ brands: 'Adler', owner: null, places: null })).toBeNull()
    expect(match({ brands: 'Adler', owner: null, places: 'Bonndorf im Schwarzwald' })?.id).toBe('osm-n3')
  })

  it('ignores products without brand', () => {
    expect(match({ brands: null, owner: null, places: 'Kreuztal' })).toBeNull()
  })
})

describe('cleanBeerName', () => {
  it.each([
    ['Krombacher Pils 0,33l', 'Krombacher Pils'],
    ['Krombacher Pils - 24 x 0.33 L Flasche', 'Krombacher Pils'],
    ['Veltins Pilsener (Dose 0,5 l)', 'Veltins Pilsener'],
    ['Rothaus Tannenzäpfle', 'Rothaus Tannenzäpfle'],
    ['0,5 l', '0,5 l'],
  ])('%s → %s', (raw, clean) => expect(cleanBeerName(raw)).toBe(clean))
})

describe('pickMainBeers', () => {
  const c = (code: string, name: string, style: string | null, abv: number | null = null, pack = null as null | { ml: number }) =>
    ({ code, name, style, abv, pack })

  it('keeps one beer per style – the most complete entry with the shortest name', () => {
    const picked = pickMainBeers([
      c('1', 'Krombacher Pils Limited Edition', 'Pils', 4.8, { ml: 330 }),
      c('2', 'Krombacher Pils', 'Pils', 4.8, { ml: 500 }),
      c('3', 'Krombacher Pils', 'Pils', null, null),
      c('4', 'Krombacher Weizen', 'Weißbier'),
    ])
    expect(picked.map((p) => p.code)).toEqual(['2', '4'])
  })

  it('fills ABV and pack from other sizes of the same beer', () => {
    const [p] = pickMainBeers([c('1', 'Hell', 'Helles', null, { ml: 500 }), c('2', 'Hell 0,33', 'Helles', 5.1)])
    expect(p).toMatchObject({ code: '1', abv: 5.1, pack: { ml: 500 } })
  })

  it('caps at five, puts Radler and alcohol-free last and unknown styles only when nothing else is known', () => {
    const styles = ['Radler', 'Alkoholfrei', 'Pils', 'Pils', 'Pils', 'Helles', 'Export', 'Bock', 'Märzen', 'Weißbier', null]
    const picked = pickMainBeers(styles.map((s, i) => c(String(i), `Bier ${i}`, s)))
    expect(picked.map((p) => p.style)).toEqual(['Pils', 'Helles', 'Export', 'Märzen', 'Weißbier'])
    expect(pickMainBeers([c('1', 'A', 'Radler'), c('2', 'B', 'Pils')]).map((p) => p.style)).toEqual(['Pils', 'Radler'])
    expect(pickMainBeers([c('1', 'Fantasie', null), c('2', 'Fantasie Gold', null)]).map((p) => p.code)).toEqual(['1'])
    expect(pickMainBeers([c('1', 'Fantasie', null), c('2', 'Pils', 'Pils')]).map((p) => p.code)).toEqual(['2'])
  })
})

describe('mainBeers', () => {
  it('turns matched products into ranked rows with style and pack, drops the rest', () => {
    const beers = mainBeers(
      [
        off({ code: '4001', name: 'Krombacher Pils 0,5l', brands: 'Krombacher', abv: 4.8, quantity: '0,5 l', packaging: 'en:glass-bottle' }),
        off({ code: '4002', name: 'Krombacher Weizen', brands: 'Krombacher', quantity: '330 ml', packaging: 'en:can' }),
        off({ code: '4001', name: 'Krombacher Pils duplicate', brands: 'Krombacher' }),
        off({ code: '4003', name: 'Irgendein Bier', brands: 'Unbekannt' }),
        off({ code: 'abc', name: 'Kaputt', brands: 'Krombacher' }),
        off({ code: '4004', name: 'Krombacher Starkbier', brands: 'Krombacher', abv: 99 }),
      ],
      [brewery({ id: 'osm-n4', name: 'Krombacher Brauerei' })],
    )
    expect(beers).toEqual([
      { id: 'r-4001', breweryId: 'osm-n4', name: 'Krombacher Pils', style: 'Pils', abv: 4.8, pack: { ml: 500 }, rank: 0 },
      { id: 'r-4002', breweryId: 'osm-n4', name: 'Krombacher Weizen', style: 'Weißbier', abv: null, pack: { ml: 330, can: true }, rank: 1 },
    ])
  })
})

describe('parsePlaces', () => {
  it('reads GeoNames postcodes and skips duplicates and other countries', () => {
    const tsv = [
      'DE\t74906\tBad Rappenau\tBaden-Württemberg\tBW\t\t\t\t\t49.2386\t9.1016\t4',
      'DE\t74906\tBad Rappenau\tBaden-Württemberg\tBW\t\t\t\t\t49.2386\t9.1016\t4',
      'DE\t74906\tFürfeld\tBaden-Württemberg\tBW\t\t\t\t\t49.21234567\t9.06\t4',
      'AT\t1010\tWien\t\t\t\t\t\t\t48.2\t16.37\t4',
      'DE\tx\tKaputt\t\t\t\t\t\t\t1\t1\t4',
    ].join('\n')
    expect(parsePlaces(tsv, 'DE')).toEqual([
      { country: 'DE', postcode: '74906', name: 'Bad Rappenau', lat: 49.2386, lon: 9.1016 },
      { country: 'DE', postcode: '74906', name: 'Fürfeld', lat: 49.2123, lon: 9.06 },
    ])
  })
})

describe('importSql', () => {
  const files = importSql(
    [brewery({ id: 'osm-n1', name: "O'Brien's Bräu", sources: ['osm', 'wikidata'] })],
    [{ id: 'r-4001', breweryId: 'osm-n1', name: 'Pils', style: 'Pils', abv: 4.9, pack: { ml: 500 }, rank: 0 }],
    [{ country: 'DE', postcode: '74906', name: 'Bad Rappenau', lat: 49.2, lon: 9.1 }],
  )

  it('writes ordered, transactional upsert files and unpublishes what is gone', () => {
    expect(files.map((f) => f.name)).toEqual(['10-breweries-001.sql', '20-beers-001.sql', '30-unpublish.sql', '40-places-001.sql'])
    for (const f of files) expect(f.sql).toMatch(/^begin;\n[\s\S]*commit;\n$/)
    expect(files[0].sql).toContain("'O''Brien''s Bräu'")
    expect(files[0].sql).toContain("'{\"osm\",\"wikidata\"}'::text[]")
    expect(files[0].sql).toContain('on conflict (id) do update set name = excluded.name')
    expect(files[1].sql).toContain(`'{"ml":500}'::jsonb`)
    expect(files[2].sql).toContain(`id <> all('{"r-4001"}'::text[])`)
    expect(files[3].sql).toContain('on conflict (country, postcode, name)')
  })

  it('splits large imports into batches', () => {
    const many = Array.from({ length: 1201 }, (_, i) => brewery({ id: `osm-n${i}`, name: `B${i}` }))
    expect(importSql(many, [], []).filter((f) => f.name.startsWith('10-')).length).toBe(3)
  })
})
