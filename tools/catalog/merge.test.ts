import { describe, expect, it } from 'vitest'
import {
  breweryMatcher,
  cleanBeerName,
  importSql,
  mainBeers,
  mergeBreweries,
  normName,
  parseOpenbeer,
  parsePlaces,
  pickMainBeers,
  stableHash,
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
  lat: 49, lon: 9, city: null, postcode: null, country: 'DE', website: null, founded: null, sources: ['osm'], qid: null, ...b,
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
    expect(hohenlohe).toMatchObject({ sources: ['osm', 'wikidata'], founded: 1849, city: 'Hohenlohe', country: 'DE', qid: 'Q10' })
    // own website wins, a bare domain becomes a URL
    expect(adler).toMatchObject({ sources: ['osm', 'wikidata'], website: 'https://adler-bier.de' })
    expect(adler2.sources).toEqual(['osm'])
    expect(kloster).toMatchObject({ sources: ['wikidata'], founded: 1100, qid: 'Q13' })
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

  it('accepts a shortened brewery name only at the brewery\'s place', () => {
    const m = breweryMatcher([brewery({ id: 'osm-n9', name: 'Augustiner-Bräu Wagner KG', city: 'München' })])
    expect(m({ brands: 'Augustiner Bräu', owner: null, places: 'München' })?.id).toBe('osm-n9')
    expect(m({ brands: 'Augustiner Bräu', owner: null, places: 'Salzburg' })).toBeNull()
    expect(m({ brands: 'Augustiner Bräu', owner: null, places: null })).toBeNull()
  })

  it('knows a brewery by its Wikidata label too and by the „-er“ adjective of its place', () => {
    const [b] = mergeBreweries(
      { DE: [], AT: [osm({ id: 'osm:n1', name: 'Augustiner Bräustübl', lat: 47.8, lon: 13.03, wikidata: 'Q5' })], CH: [] },
      { DE: [], AT: [wd({ id: 'wd:Q5', name: 'Augustiner Bräu Kloster Mülln', lat: 47.8, lon: 13.03 })], CH: [] },
    )
    expect(b.aliases).toEqual(['Augustiner Bräu Kloster Mülln'])
    expect(breweryMatcher([b])({ brands: 'Augustiner Bräu Kloster Mülln', owner: null, places: null })?.id).toBe('osm-n1')
    const zwettl = brewery({ id: 'osm-n7', name: 'Privatbrauerei Zwettl', city: 'Zwettl' })
    expect(breweryMatcher([zwettl])({ brands: 'Zwettler Brauerei', owner: null, places: null })?.id).toBe('osm-n7')
  })

  it('is strict with full brewery names from lists', () => {
    const m = breweryMatcher([
      brewery({ id: 'osm-n1', name: 'Hofbräu', city: 'Abensberg' }),
      brewery({ id: 'osm-n2', name: 'Rieder Bier GmbH', city: 'Kerzers', country: 'CH' }),
      brewery({ id: 'osm-n3', name: 'Trumer Privatbrauerei' }),
    ])
    expect(m({ brands: 'Hofbräu Kaltenhausen', owner: null, places: 'Kaltenhausen' }, true)).toBeNull()
    expect(m({ brands: 'Brauerei Ried', owner: null, places: 'Ried im Innkreis' }, true)).toBeNull()
    expect(m({ brands: 'Trumer Privatbrauerei', owner: null, places: 'Obertrum' }, true)?.id).toBe('osm-n3')
    expect(m({ brands: 'Hofbräu', owner: null, places: 'Abensberg' }, true)?.id).toBe('osm-n1')
  })

  it('needs the place for generic brewery names and more than the place for short brands', () => {
    const m = breweryMatcher([
      brewery({ id: 'osm-n1', name: 'Hofbräu', city: 'Abensberg' }),
      brewery({ id: 'osm-n2', name: 'Die Weisse', city: 'Salzburg' }),
      brewery({ id: 'osm-n3', name: 'Craftzentrum Berlin', city: 'Berlin' }),
    ])
    expect(m({ brands: 'Hofbräu München', owner: null, places: 'München' })).toBeNull()
    expect(m({ brands: 'Hofbräu', owner: null, places: 'Abensberg' })?.id).toBe('osm-n1')
    expect(m({ brands: 'Schneider Weisse', owner: null, places: null })).toBeNull()
    expect(m({ brands: 'Berliner', owner: null, places: 'Berlin' })).toBeNull()
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
      { id: 'r-4001', breweryId: 'osm-n4', name: 'Krombacher Pils', style: 'Pils', abv: 4.8, pack: { ml: 500 }, rank: 0, source: 1, sourceRef: '4001' },
      { id: 'r-4002', breweryId: 'osm-n4', name: 'Krombacher Weizen', style: 'Weißbier', abv: null, pack: { ml: 330, can: true }, rank: 1, source: 1, sourceRef: '4002' },
    ])
  })

  it('adds Wikidata beers of the brewery item, with style from the name or the item kind', () => {
    const b = brewery({ id: 'osm-n4', name: 'Krombacher Brauerei', qid: 'Q100' })
    const beers = mainBeers(
      [off({ code: '4001', name: 'Krombacher Pils', brands: 'Krombacher', abv: 4.8, quantity: '0,5 l' })],
      [b],
      [
        { id: 'wd:Q1', name: 'Krombacher Pils', brewery: 'wd:Q100', abv: 4.8, kinds: ['Pils'] },
        { id: 'wd:Q2', name: 'Krombacher Dunkel', brewery: 'wd:Q100', abv: 4.3, kinds: [] },
        { id: 'wd:Q3', name: 'Rotes Ross', brewery: 'wd:Q100', abv: null, kinds: ['Weizenbier'] },
        { id: 'wd:Q4', name: 'Q4', brewery: 'wd:Q100', abv: null, kinds: ['Bockbier'] },
        { id: 'wd:Q5', name: 'Fremdes Bier', brewery: 'wd:Q999', abv: null, kinds: [] },
        { id: 'wd:Q8', name: 'Krombacher Kellerbier', brewery: 'wd:Q998', breweryName: 'Krombacher Brauerei', abv: 5.2, kinds: ['Bier'] },
        { id: 'wd:Q6', name: 'Krombacher', brewery: 'wd:Q100', abv: null, kinds: ['Biermarke'] },
        { id: 'wd:Q7', name: 'Krombacher Export', brewery: 'wd:Q100', abv: null, kinds: ['Brauerei', 'Markenzeichen'] },
      ],
    )
    expect(beers.map((x) => [x.id, x.style, x.source, x.sourceRef])).toEqual([
      ['r-4001', 'Pils', 1, '4001'],
      ['r-q8', 'Kellerbier', 2, 'Q8'],
      ['r-q3', 'Weißbier', 2, 'Q3'],
      ['r-q2', 'Dunkles', 2, 'Q2'],
    ])
  })
})

describe('parseOpenbeer', () => {
  const ref = 'oberbayern/blob/master/1--muenchen/beers.txt'
  it('reads headers, beer lines, tables and skips brewery lists and comments', () => {
    const txt = [
      '# Big Six',
      '_________________________________',
      '- Augustiner Bräu |  München',
      '',
      'Augustiner Lagerbier Hell,  5.2%,  helles',
      'Augustiner Oktoberfestbier, 6.0%,  maerzen|oktoberfest|festbier',
      'Augustiner Heller Bock, bock      ## exits ?? check',
      '- Trumer Privatbrauerei, Obertrum',
      'Trumer Pils,   4.9%, 11.5°, lager|pils',
      'Austrian Amber Ale|AAA, 5.6%, 12.8°',
      '    Trumer Herbstbier',
      'Ottakringer Null Komma Josef {Alkoholfrei},      < 0.5 %,  6.2°, by:ottakringer',
      'Brauerei Reder, Pfeffenhausen // ',
      '6-Korn Bier                 | Pyraser Landbrauerei   | Pyras (Thalmässing), Mittelfranken',
    ].join('\n')
    expect(parseOpenbeer(txt, ref).map((r) => [r.brewery, r.city, r.name, r.abv, r.styles])).toEqual([
      ['Augustiner Bräu', 'München', 'Augustiner Lagerbier Hell', 5.2, 'helles'],
      ['Augustiner Bräu', 'München', 'Augustiner Oktoberfestbier', 6, 'maerzen|oktoberfest|festbier'],
      ['Augustiner Bräu', 'München', 'Augustiner Heller Bock', null, 'bock'],
      ['Trumer Privatbrauerei', 'Obertrum', 'Trumer Pils', 4.9, 'lager|pils'],
      ['Trumer Privatbrauerei', 'Obertrum', 'Austrian Amber Ale', 5.6, ''],
      ['Trumer Privatbrauerei', 'Obertrum', 'Trumer Herbstbier', null, ''],
      ['Trumer Privatbrauerei', 'Obertrum', 'Ottakringer Null Komma Josef', 0.5, 'Alkoholfrei'],
      ['Pyraser Landbrauerei', 'Pyras', '6-Korn Bier', null, ''],
    ])
  })

  it('needs a brewery for a beer', () => {
    expect(parseOpenbeer("Beck's Pilsner\nVormann Pils, 5.0%, 11.3°, by:vormann, pils", ref)).toEqual([])
  })

  it('gives openbeer beers stable ids and lets current sources win a style', () => {
    expect(stableHash('a')).toBe(stableHash('a'))
    expect(stableHash('a')).toMatch(/^[0-9a-f]{16}$/)
    expect(stableHash('a')).not.toBe(stableHash('b'))
    const b = brewery({ id: 'osm-n9', name: 'Augustiner-Bräu Wagner KG', city: 'München' })
    const rows = parseOpenbeer('- Augustiner Bräu | München\nAugustiner Edelstoff, 5.6%, export\nAugustiner Pils, 5.6%, pils', ref)
    const beers = mainBeers(
      [off({ code: '4001', name: 'Augustiner Pils', brands: 'Augustiner', places: 'München', abv: 5.6 })],
      [b],
      [],
      rows,
    )
    expect(beers.map((x) => [x.name, x.style, x.source])).toEqual([
      ['Augustiner Pils', 'Pils', 1],
      ['Augustiner Edelstoff', 'Export', 4],
    ])
    expect(beers[1].id).toMatch(/^r-o[0-9a-f]{16}$/)
    expect(beers[1].sourceRef).toBe(ref)
  })
})

describe('website beers', () => {
  it('belong to their crawled brewery, keep the page path and lose to more complete entries', () => {
    const b = brewery({ id: 'osm-n4', name: 'Krombacher Brauerei' })
    const beers = mainBeers(
      [off({ code: '4001', name: 'Krombacher Pils', brands: 'Krombacher', abv: 4.8, quantity: '0,5 l' })],
      [b],
      [],
      [],
      [
        { breweryId: 'osm-n4', path: '/biere/pils', name: 'Krombacher Pils', abv: 4.8 },
        { breweryId: 'osm-n4', path: '/biere/weizen', name: 'Krombacher Weizen', abv: 5.3 },
        { breweryId: 'osm-n404', path: '/x', name: 'Fremdes Helles', abv: null },
      ],
    )
    expect(beers.map((x) => [x.name, x.source, x.sourceRef])).toEqual([
      ['Krombacher Pils', 1, '4001'],
      ['Krombacher Weizen', 3, '/biere/weizen'],
    ])
    expect(beers[1].id).toMatch(/^r-w[0-9a-f]{16}$/)
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
    [{ id: 'r-4001', breweryId: 'osm-n1', name: 'Pils', style: 'Pils', abv: 4.9, pack: { ml: 500 }, rank: 0, source: 1, sourceRef: '4001' }],
    [{ country: 'DE', postcode: '74906', name: 'Bad Rappenau', lat: 49.2, lon: 9.1 }],
  )

  it('writes ordered, transactional upsert files and unpublishes what is gone', () => {
    expect(files.map((f) => f.name)).toEqual(['10-breweries-001.sql', '20-beers-001.sql', '30-unpublish.sql', '40-places-001.sql'])
    for (const f of files) expect(f.sql).toMatch(/^begin;\n[\s\S]*commit;\n$/)
    expect(files[0].sql).toContain("'O''Brien''s Bräu'")
    expect(files[0].sql).toContain("'{\"osm\",\"wikidata\"}'::text[]")
    expect(files[0].sql).toContain('on conflict (id) do update set name = excluded.name')
    expect(files[1].sql).toContain(`'{"ml":500}'::jsonb, 0, 1, '4001', true)`)
    expect(files[2].sql).toContain(`id <> all('{"r-4001"}'::text[])`)
    // app reports (R6) survive a rebuild
    expect(files[2].sql).toContain('source <> 5 and id <> all(')
    expect(files[2].sql).toContain("id not like 'app-%' and id <> all(")
    expect(files[3].sql).toContain('on conflict (country, postcode, name)')
  })

  it('splits large imports into batches', () => {
    const many = Array.from({ length: 1201 }, (_, i) => brewery({ id: `osm-n${i}`, name: `B${i}` }))
    expect(importSql(many, [], []).filter((f) => f.name.startsWith('10-')).length).toBe(3)
  })
})
