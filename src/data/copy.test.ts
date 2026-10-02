import { describe, expect, it } from 'vitest'
import raw from './beers.json'
import en from './beers.en.json'
import { translateBeer } from './beers'
import { COPY, COPY_BY_LANG } from './copy'
import type { Beer } from '../domain/types'
import { detectLang } from '../state/lang'

/** Every leaf text with its path, e.g. ['quips.LIKE.1', 'Ein Herz für {name}. Süß.']. */
function leaves(v: unknown, path = ''): [string, string][] {
  if (typeof v === 'string') return [[path, v]]
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => leaves(x, path ? `${path}.${k}` : k))
  return []
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('language', () => {
  it('stored choice wins, then the first German or English browser language', () => {
    expect(detectLang('en', ['de-DE'])).toBe('en')
    expect(detectLang('de', ['en-US'])).toBe('de')
    expect(detectLang(null, ['de-AT', 'en'])).toBe('de')
    expect(detectLang(null, ['fr-FR', 'en-GB', 'de'])).toBe('en')
    expect(detectLang(null, ['EN-us'])).toBe('en')
  })

  it('other browser languages get English, no information at all gets German', () => {
    expect(detectLang(null, ['fr-FR', 'it'])).toBe('en')
    expect(detectLang('xx', ['pl'])).toBe('en')
    expect(detectLang(null, [])).toBe('de')
  })

  it('unit tests run in German', () => {
    expect(COPY).toBe(COPY_BY_LANG.de)
  })
})

describe('English text bank', () => {
  const de = new Map(leaves(COPY_BY_LANG.de))
  const enLeaves = leaves(COPY_BY_LANG.en)

  it('has the same texts as German – no list shorter, nothing left empty', () => {
    expect(enLeaves.map(([p]) => p).sort()).toEqual([...de.keys()].sort())
    expect(enLeaves.filter(([, t]) => !t.trim())).toEqual([])
  })

  it('keeps every placeholder of the German text', () => {
    const off = enLeaves.filter(([p, t]) => placeholders(t).join() !== placeholders(de.get(p) ?? '').join())
    expect(off).toEqual([])
  })

  it('is actually translated (no German umlauts outside names)', () => {
    const names = /Häffner|Tannenzäpfle|Störtebeker|Dröppke|Lübzer|Budějovice|Plzeň|Maß/
    const german = enLeaves.filter(([, t]) => /[äöüß]/.test(t.replace(names, '')))
    expect(german).toEqual([])
  })
})

describe('English beer texts', () => {
  const beers = raw as Beer[]

  it('cover every curated beer and only those', () => {
    expect(Object.keys(en.beers).sort()).toEqual(beers.map((b) => b.id).sort())
  })

  it('translate texts and tags, keep the number of tags', () => {
    for (const b of beers) {
      const t = en.beers[b.id as keyof typeof en.beers]
      expect(t.description && t.humorousBio && t.disLikeQuip, b.id).toBeTruthy()
      expect(t.tags.length, b.id).toBe(b.tags.length)
    }
  })

  it('translateBeer swaps texts and place names, keeps everything else', () => {
    const jever = beers.find((b) => b.id === 'jever')!
    const out = translateBeer(jever, en)
    expect(out.description).toMatch(/^Frisian/)
    expect(out.country).toBe('Germany')
    expect(out.region).toBe('Friesland')
    expect({ ...out, description: '', humorousBio: '', disLikeQuip: '', tags: [], country: '' }).toEqual({
      ...jever,
      description: '',
      humorousBio: '',
      disLikeQuip: '',
      tags: [],
      country: '',
    })
  })

  it('a beer without translation (database row) stays German', () => {
    const dbBeer = { ...(raw as Beer[])[0], id: 'db-only', description: 'Nur deutsch.', country: 'Deutschland', region: 'München' }
    const out = translateBeer(dbBeer, en)
    expect(out.description).toBe('Nur deutsch.')
    expect(out.country).toBe('Germany')
    expect(out.region).toBe('Munich')
  })
})
