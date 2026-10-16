/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { confirmedBreweries, mainBeers, SOURCE } from './merge'
import type { Brewery } from './merge'
import { researchInput } from './research'
import type { ResearchEntry } from './research'

const brewery = (b: Partial<Brewery> & Pick<Brewery, 'id' | 'name'>): Brewery => ({
  lat: 49, lon: 9, city: null, postcode: null, country: 'DE', website: null, founded: null, sources: ['osm'], qid: null, ...b,
})
const entry = (e: Partial<ResearchEntry> & Pick<ResearchEntry, 'id'>): ResearchEntry => ({
  name: 'X', status: 'beers', evidence: null, beers: [], ...e,
})
const loewe = brewery({ id: 'osm-n1', name: 'Löwenbräu Dorf', website: 'https://www.loewe.example/' })
const post = brewery({ id: 'osm-n2', name: 'Gasthof Post' })

describe('researchInput (V12)', () => {
  it('beers on the own website count like crawled ones, others become the research source', () => {
    const r = researchInput(
      [entry({ id: 'osm-n1', beers: [
        { name: 'Löwen Hell', style: 'Helles', abv: 4.9, url: 'https://loewe.example/biere?x=1' },
        { name: 'Löwen Weisse', style: 'Weißbier', abv: null, url: 'https://bierfuehrer.example/loewe' },
      ] })],
      [loewe],
    )
    expect(r.web).toEqual([{ breweryId: 'osm-n1', path: '/biere?x=1', name: 'Löwen Hell', abv: 4.9, style: 'Helles' }])
    expect(r.other).toEqual([{ breweryId: 'osm-n1', name: 'Löwen Weisse', style: 'Weißbier', abv: null, url: 'https://bierfuehrer.example/loewe' }])
  })

  it('hides closed breweries and places without own beer only with the page that shows it', () => {
    const r = researchInput(
      [
        entry({ id: 'osm-n1', status: 'closed', evidence: 'https://zeitung.example/loewe-schliesst' }),
        entry({ id: 'osm-n2', status: 'no-own-beer', evidence: null }),
      ],
      [loewe, post],
    )
    expect([...r.hidden]).toEqual(['osm-n1'])
  })

  it('ignores unclear entries, unknown breweries, beers without a link and links to other sites over http', () => {
    const r = researchInput(
      [
        entry({ id: 'osm-n9', beers: [{ name: 'Gone Pils', style: null, abv: null, url: 'https://x.example/' }] }),
        entry({ id: 'osm-n2', status: 'unclear', beers: [{ name: 'Post Hell', style: null, abv: null, url: 'https://x.example/' }] }),
        entry({ id: 'osm-n1', beers: [
          { name: 'Löwen Pils', style: null, abv: null, url: '' },
          { name: 'Löwen Dunkel', style: null, abv: null, url: 'http://shop.example/dunkel' },
          { name: ' ', style: null, abv: null, url: 'https://shop.example/' },
        ] }),
      ],
      [loewe, post],
    )
    expect(r).toEqual({ hidden: new Set(), web: [], other: [] })
  })

  it('takes at most three beers per brewery, in the listed order', () => {
    const beers = ['Hell', 'Pils', 'Weisse', 'Dunkel', 'Bock'].map((n) => ({ name: `Löwen ${n}`, style: null, abv: null, url: 'https://shop.example/' }))
    const r = researchInput([entry({ id: 'osm-n1', beers: [{ name: 'Löwen X', style: null, abv: null, url: '' }, ...beers] })], [loewe])
    expect(r.other.map((b) => b.name)).toEqual(['Löwen Hell', 'Löwen Pils', 'Löwen Weisse'])
  })

  it('a researched beer is found (1); a second source confirms it (2), with the same ABV it is checked (3)', () => {
    const r = researchInput(
      [entry({ id: 'osm-n2', beers: [{ name: 'Post Helles', style: 'Helles', abv: 5, url: 'https://bierfuehrer.example/post' }] })],
      [loewe, post],
    )
    const [alone] = mainBeers([], [post], [], [], [], [], r.other)
    expect(alone).toMatchObject({ name: 'Post Helles', style: 'Helles', abv: 5, source: SOURCE.research, sourceRef: 'https://bierfuehrer.example/post', quality: 1 })
    const crawled = (abv: number | null) => [{ breweryId: 'osm-n2', path: '/', name: 'Post Helles', abv }]
    expect(mainBeers([], [post], [], [], crawled(null), [], r.other)[0].quality).toBe(2)
    expect(mainBeers([], [post], [], [], crawled(5), [], r.other)[0].quality).toBe(3)
  })
})

describe('confirmedBreweries (V12)', () => {
  it('drops breweries only Wikidata knows, without website and beer', () => {
    const monument = brewery({ id: 'wd-q1', name: 'Brauerei Rote Straße 10 in Zirndorf (D-5-73-134-39#9)', sources: ['wikidata'] })
    const withSite = brewery({ id: 'wd-q2', name: 'Klosterbrauerei', sources: ['wikidata'], website: 'https://kloster.example/' })
    const withBeer = brewery({ id: 'wd-q3', name: 'Altbrauerei', sources: ['wikidata'] })
    const both = brewery({ id: 'osm-n3', name: 'Dorfbrauerei', sources: ['osm', 'wikidata'] })
    expect(confirmedBreweries([monument, withSite, withBeer, both], [{ breweryId: 'wd-q3' }]).map((b) => b.id)).toEqual(['wd-q2', 'wd-q3', 'osm-n3'])
  })
})

describe('tools/catalog/research/*.json', () => {
  const dir = join(import.meta.dirname, 'research')
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const entries = files.flatMap((f) => (JSON.parse(readFileSync(join(dir, f), 'utf8')) as ResearchEntry[]).map((e) => ({ ...e, file: f })))

  it('one entry per brewery, every beer and every hidden brewery with its page', () => {
    const ids = entries.map((e) => e.id)
    expect(ids.length - new Set(ids).size).toBe(0)
    for (const e of entries) {
      expect(e.id, e.file).toMatch(/^(osm-[nwr]|wd-q)[0-9]+$|^obdb-[0-9a-f-]{36}$/)
      expect(['beers', 'no-own-beer', 'closed', 'unclear'], e.id).toContain(e.status)
      if (e.status === 'closed' || e.status === 'no-own-beer') expect(e.evidence, e.id).toMatch(/^https?:\/\//)
      if (e.status === 'beers') expect(e.beers.length, e.id).toBeGreaterThan(0)
      else expect(e.beers, e.id).toEqual([])
      for (const b of e.beers) {
        expect(b.name.trim(), e.id).not.toBe('')
        expect(b.url, `${e.id} ${b.name}`).toMatch(/^https?:\/\/\S+$/)
        // alcohol-free beers state 0 – kept in the file, researchInput stores no ABV for them
        if (b.abv != null) expect(b.abv, `${e.id} ${b.name}`).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
