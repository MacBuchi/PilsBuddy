import { describe, expect, it } from 'vitest'
import {
  beerQuality,
  breweryBySite,
  breweryMatcher,
  cleanBeerName,
  importSql,
  mainBeers,
  mergeBreweries,
  normName,
  notABeerName,
  oneCompany,
  siteKey,
  tidyBeerName,
  twinKey,
  parseOpenbeer,
  parsePlaces,
  pickMainBeers,
  stableHash,
  tooFew,
} from './merge'
import type { Brewery, ObdbRow, OffRow, OsmRow, WikidataRow } from './merge'

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
  it('drops English and French company words too', () => {
    expect(normName('Sierra Nevada Brewing Co.')).toBe(normName('Sierra Nevada Brewing Company'))
    expect(normName('Rogue Ales & Spirits, Inc.')).toBe('rogue spirits')
    expect(normName('Microbrasserie Charlevoix Ltée')).toBe('charlevoix')
  })
})

describe('mergeBreweries', () => {
  const none = { DE: [], AT: [], CH: [], CA: [], US: [] }
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

  const obdb = (o: Partial<ObdbRow> & Pick<ObdbRow, 'id' | 'name'>): ObdbRow => ({
    lat: null, lon: null, city: null, postcode: null, website: null, ...o,
  })
  const UUID = (n: number) => `0000000${n}-aaaa-4bbb-8ccc-dddddddddddd`
  it('adds Open Brewery DB breweries, merges them into OSM by name and places them at their postcode', () => {
    const merged = mergeBreweries(
      { ...none, US: [osm({ id: 'osm:n1', name: 'Sierra Nevada Brewing Co.', lat: 39.7246, lon: -121.8164 })] },
      none,
      {
        US: [
          obdb({ id: `obdb:${UUID(1)}`, name: 'Sierra Nevada Brewing Company', lat: 39.725, lon: -121.817, website: 'http://www.sierranevada.com' }),
          obdb({ id: `obdb:${UUID(2)}`, name: "Bell's Brewery", postcode: '49001-1234', city: 'Kalamazoo' }),
          obdb({ id: `obdb:${UUID(3)}`, name: 'Nowhere Brewing', postcode: '99999' }),
          obdb({ id: 'obdb:not-a-uuid', name: 'Broken', lat: 40, lon: -100 }),
        ],
        CA: [obdb({ id: `obdb:${UUID(4)}`, name: '33 Acres Brewing Company', postcode: 'V5Y 1M8' })],
      },
      [
        { country: 'US', postcode: '49001', name: 'Kalamazoo', lat: 42.27, lon: -85.59 },
        { country: 'US', postcode: '49001', name: 'Kalamazoo East', lat: 42.29, lon: -85.55 },
        { country: 'CA', postcode: 'V5Y', name: 'Vancouver', lat: 49.26, lon: -123.11 },
      ],
    )
    expect(merged.map((b) => b.id)).toEqual([`obdb-${UUID(2)}`, `obdb-${UUID(4)}`, 'osm-n1'])
    const [bells, acres, sierra] = merged
    expect(sierra).toMatchObject({ sources: ['osm', 'obdb'], website: 'http://www.sierranevada.com', country: 'US' })
    expect(bells).toMatchObject({ sources: ['obdb'], lat: 42.28, lon: -85.57, postcode: '49001-1234', country: 'US' })
    expect(acres).toMatchObject({ country: 'CA', lat: 49.26, lon: -123.11 })
  })
})

describe('tooFew', () => {
  it('names every country below its minimum, so no country is unpublished by a broken download', () => {
    const bs = [brewery({ id: 'osm-n1', name: 'A' }), brewery({ id: 'osm-n2', name: 'B', country: 'US' })]
    expect(tooFew(bs, 1)).toEqual(['AT: 0 < 1', 'CH: 0 < 1', 'CA: 0 < 1'])
    expect(tooFew(bs)).toContain('US: 1 < 3000')
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

  it('knows a Wikidata brewery without the place in its name (V10), but keeps a place adjective', () => {
    const m = breweryMatcher([
      brewery({ id: 'osm-n1', name: 'Augustiner Bräu München', city: 'München', qid: 'Q153546' }),
      brewery({ id: 'osm-n2', name: 'Haller Löwenbräu', city: 'Schwäbisch Hall', qid: 'Q1' }),
      brewery({ id: 'osm-n3', name: 'Stella Fulda', city: 'Fulda' }),
    ])
    expect(m({ brands: 'Augustiner-Bräu', owner: null, places: null })?.id).toBe('osm-n1')
    expect(m({ brands: 'Löwenbräu', owner: null, places: null })).toBeNull()
    expect(m({ brands: 'Stella Artois', owner: null, places: null })).toBeNull()
  })

  it('reads „-er“ as the place only when it is the whole brand, and counts short words (V10)', () => {
    const m = breweryMatcher([
      brewery({ id: 'osm-n1', name: 'Brewery Becker', country: 'US' }),
      brewery({ id: 'osm-n2', name: 'Brauerei Göss' }),
      brewery({ id: 'osm-n3', name: 'Berlin Brewing Company', city: 'Berlin', country: 'US' }),
      brewery({ id: 'osm-n4', name: 'Flying Dog Brewery', country: 'US' }),
      brewery({ id: 'osm-n5', name: 'Mill 77 Brewing', country: 'US' }),
    ])
    expect(m({ brands: "Beck's", owner: null, places: null })).toBeNull()
    expect(m({ brands: 'Gösser', owner: null, places: null })?.id).toBe('osm-n2')
    expect(m({ brands: 'Berliner Kindl', owner: null, places: null })).toBeNull()
    expect(m({ brands: 'Flying Monkeys', owner: null, places: null })).toBeNull()
    expect(m({ brands: 'Flying Dog', owner: null, places: null })?.id).toBe('osm-n4')
    expect(m({ brands: 'Miller', owner: null, places: null })).toBeNull()
  })

  it('gives a tie to the Wikidata item, not its taproom', () => {
    const m = breweryMatcher([
      brewery({ id: 'osm-n1', name: 'Paulaner Bräuhaus', city: 'München', website: 'https://paulaner-brauhaus.de' }),
      brewery({ id: 'osm-w2', name: 'Paulaner Brauerei', city: 'München', qid: 'Q127305', website: 'https://paulaner.de' }),
    ])
    expect(m({ brands: 'Paulaner', owner: null, places: 'München' })?.id).toBe('osm-w2')
  })

  it('takes the main entry of one company with several entries (V10)', () => {
    const m = breweryMatcher([
      brewery({ id: 'osm-n1', name: 'Burial Beer', city: 'Raleigh', website: 'https://burialbeer.com/pages/raleigh' }),
      brewery({ id: 'osm-n2', name: 'Burial Beer Company', city: 'Asheville', website: 'https://burialbeer.com/' }),
      brewery({ id: 'osm-n3', name: 'Burial Beer', city: 'Asheville' }),
      brewery({ id: 'osm-n4', name: 'Bitburger Brauerei', website: 'https://www.bitburger.de/' }),
      brewery({ id: 'osm-n5', name: 'Bitburger Brauerei', city: 'Bitburg', qid: 'Q706698' }),
    ])
    expect(m({ brands: 'Burial', owner: null, places: null })?.id).toBe('osm-n2')
    expect(m({ brands: 'Bitburger', owner: null, places: null })?.id).toBe('osm-n5')
    // different websites or two Wikidata items: maybe two breweries – no guess
    expect(match({ brands: 'Adler', owner: null, places: null })).toBeNull()
    expect(oneCompany([brewery({ id: 'a', name: 'Adler', qid: 'Q1' }), brewery({ id: 'b', name: 'Adler', qid: 'Q2' })])).toBeNull()
    expect(oneCompany([brewery({ id: 'a', name: 'Adler', website: 'a.de' }), brewery({ id: 'b', name: 'Adler', website: 'b.de', qid: 'Q2' })])).toBeNull()
    // one website alone does not make a company
    expect(oneCompany([brewery({ id: 'a', name: 'Adler', website: 'a.de' }), brewery({ id: 'b', name: 'Adler' })])).toBeNull()
  })

  it('matches full brewery names word for word in exact mode (V10)', () => {
    const m = breweryMatcher([
      brewery({ id: 'osm-n1', name: 'Modern Brewery', city: 'Saint Louis', country: 'US' }),
      brewery({ id: 'osm-n2', name: 'Porter Pizza & Brewery', country: 'US' }),
      brewery({ id: 'osm-n3', name: '32 North Brewing Co', country: 'US' }),
      brewery({ id: 'osm-n4', name: "Kane's", country: 'US' }),
      brewery({ id: 'osm-n5', name: 'Odell Brewing Co - Denver', city: 'Denver', country: 'US' }),
      brewery({ id: 'osm-n6', name: 'Rahr and Sons Brewing Co', country: 'US' }),
      brewery({ id: 'osm-n7', name: 'Hofbräu', city: 'Abensberg' }),
    ])
    const exact = (brands: string, places: string | null = null) => m({ brands, owner: null, places }, false, true)?.id ?? null
    expect(exact('Modern Times Beer')).toBeNull()
    expect(m({ brands: 'Modern Times Beer', owner: null, places: null })?.id).toBe('osm-n1') // what the loose mode did
    expect(exact('Pizza Port Brewing Company')).toBeNull()
    expect(exact('450 North Brewing Company')).toBeNull()
    expect(exact('Kane Brewing Company')).toBeNull()
    expect(exact('Odell Brewing Company')).toBe('osm-n5')
    expect(exact('Rahr & Sons Brewing Company')).toBe('osm-n6')
    // a generic name needs the place
    expect(exact('Hofbräu')).toBeNull()
    expect(exact('Hofbräu', 'Abensberg')).toBe('osm-n7')
  })
})

describe('siteKey / breweryBySite (V10)', () => {
  it('keys a website by its host and ignores hosts many breweries share', () => {
    expect(siteKey('https://www.Bitburger.de/biere')).toBe('bitburger.de')
    expect(siteKey('burialbeer.com')).toBe('burialbeer.com')
    expect(siteKey('https://www.facebook.com/somebrewery')).toBeNull()
    expect(siteKey('https://untappd.com/b/x')).toBeNull()
    expect(siteKey('not a url')).toBeNull()
    expect(siteKey(null)).toBeNull()
  })

  it('finds the brewery by its website, the main entry when several share it', () => {
    const bySite = breweryBySite([
      brewery({ id: 'osm-n1', name: 'Aslin Beer Company', website: 'https://www.aslinbeer.com/pittsburgh' }),
      brewery({ id: 'osm-n2', name: 'Aslin Beer Company', website: 'https://www.aslinbeer.com/' }),
      brewery({ id: 'osm-n3', name: 'Krombacher', website: 'https://krombacher.de' }),
    ])
    expect(bySite('http://aslinbeer.com')?.id).toBe('osm-n2')
    expect(bySite('https://www.krombacher.de/biere')?.id).toBe('osm-n3')
    expect(bySite('https://other.com')).toBeNull()
    expect(bySite(null)).toBeNull()
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

  it('prefers a real name over a bare style line (V9)', () => {
    const picked = pickMainBeers([c('1', 'IPA', 'IPA', 6.5), c('2', 'Hop Drop IPA', 'IPA'), c('3', 'Pils', 'Pils')])
    expect(picked.map((p) => p.name)).toEqual(['Hop Drop IPA', 'Pils'])
    expect(picked[0].abv).toBeNull()
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
      { id: 'r-4001', breweryId: 'osm-n4', name: 'Krombacher Pils', style: 'Pils', abv: 4.8, pack: { ml: 500 }, rank: 0, source: 1, sourceRef: '4001', quality: 2 },
      { id: 'r-4002', breweryId: 'osm-n4', name: 'Krombacher Weizen', style: 'Weißbier', abv: null, pack: { ml: 330, can: true }, rank: 1, source: 1, sourceRef: '4002', quality: 2 },
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

  it('read a bare „Blonde“ as a blonde ale in English-speaking countries', () => {
    const us = brewery({ id: 'obdb-0', name: 'Beachwood Brewing', country: 'US' })
    const de = brewery({ id: 'osm-n5', name: 'Brauerei Blond' })
    const beers = mainBeers([], [us, de], [], [], [
      { breweryId: 'obdb-0', path: '/', name: 'Beachwood Blonde', abv: null },
      { breweryId: 'obdb-0', path: '/', name: 'Belgian Blonde', abv: null },
      { breweryId: 'osm-n5', path: '/', name: 'Klosterbier Blonde', abv: null },
    ])
    expect(beers.map((x) => [x.name, x.style])).toEqual([
      ['Belgian Blonde', 'Abbey Blonde'],
      ['Beachwood Blonde', 'Blonde Ale'],
      ['Klosterbier Blonde', 'Abbey Blonde'],
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
  it('reads US ZIP codes and Canadian FSAs', () => {
    const tsv = ['US\t95928\tChico\tCalifornia\tCA\t\t\t\t\t39.7285\t-121.8375\t4', 'US\t9592\tKaputt\t\t\t\t\t\t\t1\t1\t4', 'CA\tJ3L\tChambly\tQuebec\tQC\t\t\t\t\t45.45\t-73.29\t6', 'CA\tJ3L 2C7\tChambly\t\t\t\t\t\t\t1\t1\t6'].join('\n')
    expect(parsePlaces(tsv, 'US').map((p) => p.postcode)).toEqual(['95928'])
    expect(parsePlaces(tsv, 'CA').map((p) => p.postcode)).toEqual(['J3L'])
  })
})

describe('importSql', () => {
  const files = importSql(
    [brewery({ id: 'osm-n1', name: "O'Brien's Bräu", sources: ['osm', 'wikidata'] })],
    [{ id: 'r-4001', breweryId: 'osm-n1', name: 'Pils', style: 'Pils', abv: 4.9, pack: { ml: 500 }, rank: 0, source: 1, sourceRef: '4001', quality: 2 }],
    [{ country: 'DE', postcode: '74906', name: 'Bad Rappenau', lat: 49.2, lon: 9.1 }],
  )

  it('writes ordered, transactional upsert files and unpublishes what is gone', () => {
    expect(files.map((f) => f.name)).toEqual(['05-guard.sql', '10-breweries-001.sql', '20-beers-001.sql', '30-unpublish.sql', '40-places-001.sql'])
    const [, brew, beer, unpublish, places] = files
    for (const f of [brew, beer, unpublish, places]) expect(f.sql).toMatch(/^begin;\n[\s\S]*commit;\n$/)
    expect(brew.sql).toContain("'O''Brien''s Bräu'")
    expect(brew.sql).toContain("'{\"osm\",\"wikidata\"}'::text[]")
    expect(brew.sql).toContain('on conflict (id) do update set name = excluded.name')
    expect(beer.sql).toContain(`'{"ml":500}'::jsonb, 0, 1, '4001', 2, true)`)
    expect(unpublish.sql).toContain(`id <> all('{"r-4001"}'::text[])`)
    // app reports (R6) survive a rebuild
    expect(unpublish.sql).toContain('source <> 5 and id <> all(')
    expect(unpublish.sql).toContain("id not like 'app-%' and id <> all(")
    expect(places.sql).toContain('on conflict (country, postcode, name)')
  })

  it('starts with a guard against a country that came back short', () => {
    const guard = files[0].sql
    expect(guard).toContain("(values ('DE', 1), ('AT', 0), ('CH', 0), ('CA', 0), ('US', 0))")
    expect(guard).toContain('if r.count < r.live * 0.9 then')
    expect(guard).toContain("where published and id not like 'app-%'")
  })

  it('splits large imports into batches', () => {
    const many = Array.from({ length: 1201 }, (_, i) => brewery({ id: `osm-n${i}`, name: `B${i}` }))
    expect(importSql(many, [], []).filter((f) => f.name.startsWith('10-')).length).toBe(3)
  })
})

describe('V10 – second sources', () => {
  it('finds a Wikidata beer by the brewery website and full brewery names word for word', () => {
    const beers = mainBeers(
      [],
      [
        brewery({ id: 'osm-n1', name: 'Great Notion Brewing NW', country: 'US', website: 'https://greatnotion.com/nw' }),
        brewery({ id: 'osm-n2', name: 'Great Notion Brewing', country: 'US', website: 'https://greatnotion.com' }),
        brewery({ id: 'osm-n3', name: 'Modern Brewery', country: 'US' }),
      ],
      [
        { id: 'wd:Q1', name: 'Ripe IPA', brewery: 'wd:Q10', breweryName: 'Great Notion Brewing', breweryWebsite: 'https://www.greatnotion.com/', abv: 7, kinds: ['IPA'] },
        { id: 'wd:Q2', name: 'Orderville', brewery: 'wd:Q20', breweryName: 'Modern Times Beer', abv: 7.2, kinds: ['IPA'] },
      ],
    )
    expect(beers.map((b) => [b.breweryId, b.name])).toEqual([['osm-n2', 'Ripe IPA']])
  })

  it('needs the exact brewery name for a product not sold in the brewery\'s country', () => {
    const breweries = [brewery({ id: 'obdb-1', name: 'Desperados Brewery', country: 'US' }), brewery({ id: 'osm-n2', name: 'Flying Dog Brewery', country: 'US' })]
    const beers = mainBeers(
      [
        off({ code: '4001', name: 'Desperados Original', brands: 'Desperados Tequila', countries: ['DE'] }),
        off({ code: '4002', name: 'Desperados Lime', brands: 'Desperados Tequila', countries: ['DE', 'US'] }),
        off({ code: '4003', name: 'Snake Dog IPA', brands: 'Flying Dog', countries: ['DE'] }),
      ],
      breweries,
    )
    expect(beers.map((b) => b.sourceRef)).toEqual(['4002', '4003'])
  })

  it('reads the brand from the name when Open Food Facts has none, and takes beers sold abroad by the exact name', () => {
    const breweries = [
      brewery({ id: 'osm-n1', name: 'Tucher Bräu', city: 'Fürth', qid: 'Q2453287' }),
      brewery({ id: 'osm-n2', name: 'Brauerei Adler', city: 'Dettingen' }),
      brewery({ id: 'osm-n3', name: 'The Lion Brewery', city: 'Wilkes-Barre', country: 'US', qid: 'Q7747745' }),
      brewery({ id: 'osm-n4', name: 'Lancaster Brewing Company', city: 'Lancaster', country: 'US', qid: 'Q6483720' }),
    ]
    const beers = mainBeers(
      [
        off({ code: '4001', name: 'Tucher Helles' }),
        off({ code: '4005', name: 'Dunkles aus Fürth von Tucher' }),
        off({ code: '4006', name: 'Tucher Bräu Hefeweizen Dunkel 0,5l' }),
        off({ code: '4007', name: 'Tucher Zwickl Spezial Edition' }),
        off({ code: '4002', name: 'Tucher Weizen', brands: 'Tucher', abroad: true }),
        off({ code: '4003', name: 'Adler Lager', brands: 'Adler Beer Company', abroad: true }),
        off({ code: '4004', name: 'Adler Pils', abroad: true }),
        off({ code: '4008', name: 'Lion Stout', brands: 'Lion', abroad: true }),
        off({ code: '4009', name: 'Lancaster Bomber', brands: 'Lancaster Brewery Ltd', abroad: true }),
      ],
      breweries,
    )
    expect(beers.map((b) => [b.breweryId, b.name])).toEqual([
      ['osm-n1', 'Tucher Helles'],
      ['osm-n1', 'Tucher Weizen'],
      ['osm-n1', 'Tucher Bräu Hefeweizen Dunkel'],
    ])
  })

  it('knows the same beer with and without the brewery name', () => {
    expect(twinKey('Augustiner Edelstoff 0,5l', ['Augustiner Bräu München'])).toBe(twinKey('Edelstoff', ['Augustiner Bräu München']))
    expect(twinKey('Zwettler Pils', ['Privatbrauerei Zwettl'])).toBe('pils')
    expect(twinKey('Krombacher', ['Krombacher Brauerei'])).toBe('krombacher')
    expect(twinKey('Pils Alkoholfrei', ['Krombacher'])).not.toBe(twinKey('Pils', ['Krombacher']))
  })

  it('counts a twin from another source, prefers backed beers and fills the ABV from the twin', () => {
    const b = brewery({ id: 'osm-n9', name: 'Augustiner Bräu München', city: 'München', qid: 'Q153546' })
    const beers = mainBeers(
      [],
      [b],
      [{ id: 'wd:Q1', name: 'Augustiner Edelstoff', brewery: 'wd:Q153546', abv: null, kinds: ['Exportbier'] }],
      [],
      [
        { breweryId: 'osm-n9', path: '/biere', name: 'Edelstoff', abv: 5.6 },
        { breweryId: 'osm-n9', path: '/biere', name: 'Export Spezial', abv: 5.5 },
        { breweryId: 'osm-n9', path: '/biere', name: 'Lagerbier Hell', abv: 5.2 },
      ],
    )
    // Edelstoff wins the Export slot over the website-only beer, keeps the Wikidata id and gets the website's ABV
    expect(beers.map((x) => [x.id, x.name, x.style, x.abv, x.quality])).toEqual([
      ['r-q1', 'Augustiner Edelstoff', 'Export', 5.6, 2],
      [beers[1].id, 'Lagerbier Hell', 'Helles', 5.2, 1],
    ])
  })

  it('lists the same beer once even when two sources give it different styles', () => {
    const b = brewery({ id: 'osm-n4', name: 'Krombacher Brauerei', qid: 'Q100' })
    const beers = mainBeers(
      [],
      [b],
      [{ id: 'wd:Q1', name: 'Krombacher Hell', brewery: 'wd:Q100', abv: 5, kinds: ['Lagerbier'] }],
      [],
      [{ breweryId: 'osm-n4', path: '/', name: 'Hell', abv: 5 }],
    )
    expect(beers).toHaveLength(1)
    expect(beers[0].quality).toBe(3)
  })
})

describe('V1/V4 – beer quality', () => {
  const e = (source: number, style: string | null, abv: number | null) => ({ source, style, abv })

  it('crawler raw data = gefunden, a beer that exists = bestätigt, a 2014 list alone = fraglich', () => {
    expect(beerQuality([e(1, 'Pils', 4.9)], { style: 'Pils', abv: 4.9 })).toBe(2)
    expect(beerQuality([e(2, null, 5)], { style: null, abv: 5 })).toBe(2)
    expect(beerQuality([e(1, 'Pils', null)], { style: 'Pils', abv: null })).toBe(2)
    expect(beerQuality([e(3, 'IPA', 6.5), e(4, null, null)], { style: 'IPA', abv: 6.5 })).toBe(2)
    expect(beerQuality([e(3, 'IPA', 6.5)], { style: 'IPA', abv: 6.5 })).toBe(1)
    expect(beerQuality([e(3, 'IPA', 6.5), e(3, 'IPA', 6.5)], { style: 'IPA', abv: 6.5 })).toBe(1)
    expect(beerQuality([e(4, 'Helles', 4.9)], { style: 'Helles', abv: 4.9 })).toBe(0)
    expect(beerQuality([e(3, null, null)], { style: null, abv: null })).toBe(0)
  })

  it('all data agree = geprüft: style known, two sources with the same ABV, none contradicting', () => {
    expect(beerQuality([e(1, 'Pils', 4.8), e(3, 'Pils', 4.9)], { style: 'Pils', abv: 4.8 })).toBe(3)
    expect(beerQuality([e(2, null, 5.2), e(3, 'Weißbier', 5.2)], { style: 'Weißbier', abv: 5.2 })).toBe(3)
    // one source alone, even a barcode, only shows that the beer exists
    expect(beerQuality([e(1, 'Pils', 4.8), e(1, 'Pils', 4.8)], { style: 'Pils', abv: 4.8 })).toBe(2)
    // the second source names the beer but no ABV
    expect(beerQuality([e(1, 'Pils', 4.8), e(3, 'Pils', null)], { style: 'Pils', abv: 4.8 })).toBe(2)
    // contradictions keep it at bestätigt
    expect(beerQuality([e(1, 'Pils', 4.8), e(3, 'Pils', 4.8), e(4, 'Pils', 5.4)], { style: 'Pils', abv: 4.8 })).toBe(2)
    expect(beerQuality([e(1, 'Pils', 4.8), e(3, 'Helles', 4.8)], { style: 'Pils', abv: 4.8 })).toBe(2)
    // no style → the data are not complete
    expect(beerQuality([e(1, null, 4.8), e(2, null, 4.8)], { style: null, abv: 4.8 })).toBe(2)
  })

  it('counts every source naming the picked beer', () => {
    const b = brewery({ id: 'osm-n4', name: 'Krombacher Brauerei', website: 'https://krombacher.de' })
    const beers = mainBeers(
      [],
      [b],
      [],
      [{ ref: 'r/beers.txt', brewery: 'Krombacher', city: null, name: 'Krombacher Weizen', abv: 5.3, styles: 'weizen' }],
      [
        { breweryId: 'osm-n4', path: '/biere', name: 'Krombacher Pils', abv: 4.8 },
        { breweryId: 'osm-n4', path: '/biere', name: 'Krombacher Weizen', abv: null },
      ],
    )
    // the Weizen is on the website and in openbeer, with an ABV from the list → bestätigt; the Pils only on the website
    expect(beers.map((x) => [x.name, x.quality])).toEqual([['Krombacher Weizen', 2], ['Krombacher Pils', 1]])
  })

  it('tidies website layout around a name, keeps apostrophes and leading numbers that belong to it', () => {
    expect(tidyBeerName('#10 Pilsner')).toBe('Pilsner')
    expect(tidyBeerName('> Caramel Porter -->')).toBe('Caramel Porter')
    expect(tidyBeerName('* Lazy Frog IPA')).toBe('Lazy Frog IPA')
    expect(tidyBeerName('‹Loncium› Helles')).toBe('Loncium Helles')
    expect(tidyBeerName('Schwalm Bräu „Pilsener')).toBe('Schwalm Bräu Pilsener')
    expect(tidyBeerName('Northern Light *NEW*')).toBe('Northern Light')
    expect(tidyBeerName('Mudcat Rauchbier 🥈')).toBe('Mudcat Rauchbier')
    for (const n of ["Bill's Pils", 'Coal Miner’s Kölsch', '24 Karat Lager', "Cruisin'", '805']) expect(tidyBeerName(n)).toBe(n)
  })

  it('shows the tidied name, keeps the id of the raw one', () => {
    const [beer] = mainBeers([], [brewery({ id: 'osm-n4', name: 'Hopfenhaus' })], [], [], [{ breweryId: 'osm-n4', path: '/', name: '#10 Pilsner', abv: 4.8 }])
    expect(beer.name).toBe('Pilsner')
    expect(beer.id).toBe(`r-w${stableHash(`osm-n4|${normName('#10 Pilsner')}`)}`)
  })

  it('drops merchandise and names that are no name, from every source', () => {
    for (const n of ['🥉 Bronze – Hoppy Lager', '#LagerIsLife', '** The Ales **', 'Lagers', 'ABV Calculator', 'T-Shirt Schwarz', 'T-Shirt “Schloss” – dunkelgrün', 'Alt Logo Flat Cap', '@ Peculier Ales', '51631', 'Cardigan Cream Ale Six-Pack', 'Gutschein Pils', 'Hoodie IPA'])
      expect(notABeerName(n), n).toBe(true)
    for (const n of ['Whitecap American White Ale', 'Shirtless IPA', '805', '1516 Bayrisch Hell', '60 Minute IPA', 'Main Street Lager', 'Hourglass IPA', 'Red Jacket Amber Ale', 'Lager', 'Mudcat Rauchbier 🥈'])
      expect(notABeerName(n), n).toBe(false)
    const beers = mainBeers([], [brewery({ id: 'osm-n4', name: 'Schlossbräu' })], [], [], [
      { breweryId: 'osm-n4', path: '/shop', name: 'T-Shirt Schwarz', abv: null },
      { breweryId: 'osm-n4', path: '/biere', name: 'Schloss Schwarzbier', abv: 4.9 },
    ])
    expect(beers.map((x) => x.name)).toEqual(['Schloss Schwarzbier'])
  })
})
