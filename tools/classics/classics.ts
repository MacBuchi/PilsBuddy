// Researched classics (Stufe N): the record format and the pure steps from record to curated beer.
import { classicTaste } from '../../src/domain/classicTaste'
import type { TasteAdjust } from '../../src/domain/classicTaste'
import { styleColor } from '../../src/domain/styleProfile'
import type { Beer } from '../../src/domain/types'

/** One research file per country, in deck order. */
export const CLASSIC_FILES = ['ca.json'] as const

interface Texts {
  description: string
  humorousBio: string
  disLikeQuip: string
  tags: string[]
}

export interface Classic {
  id: string
  name: string
  fullName: string
  brewery: string
  /** German display name, like the other curated beers („Kanada“, „USA“). */
  country: string
  /** German region name (province/state). */
  region: string
  city: string
  /** Canonical style (STYLE_PROFILES). */
  style: string
  abv: number
  ibu?: number
  /** Where ABV/IBU/style were checked – the brewery first, else the best secondary source. */
  source: string
  /** Date of the check (YYYY-MM-DD). */
  verified: string
  note?: string
  adjust?: TasteAdjust[]
  de: Texts
  en: Texts
}

/** English names of the German country/region names the classics use (beers.en.json). */
export const COUNTRY_EN: Record<string, string> = { Kanada: 'Canada' }
export const REGION_EN: Record<string, string> = {
  'Britisch-Kolumbien': 'British Columbia',
  Neuschottland: 'Nova Scotia',
  Neufundland: 'Newfoundland',
}

/** The curated beer for a research record; a hand-made bottle or reference flag of an existing entry stays. */
export function classicBeer(c: Classic, existing?: Partial<Beer>): Beer {
  return {
    id: c.id,
    name: c.name,
    fullName: c.fullName,
    brewery: c.brewery,
    country: c.country,
    region: c.region,
    abv: c.abv,
    style: c.style,
    taste: classicTaste(c),
    ...c.de,
    color: styleColor(c.style),
    ...(existing?.bottle ? { bottle: existing.bottle } : {}),
    ...(existing?.reference ? { reference: existing.reference } : {}),
  }
}

interface EnglishFile {
  countries: Record<string, string>
  regions: Record<string, string>
  beers: Record<string, Texts>
}

export function englishTexts(en: EnglishFile, classics: readonly Classic[]): EnglishFile {
  const out: EnglishFile = { countries: { ...en.countries }, regions: { ...en.regions }, beers: { ...en.beers } }
  for (const c of classics) {
    if (COUNTRY_EN[c.country]) out.countries[c.country] = COUNTRY_EN[c.country]
    if (REGION_EN[c.region]) out.regions[c.region] = REGION_EN[c.region]
    out.beers[c.id] = c.en
  }
  return out
}

// beers.json style: one key per line, nested objects and arrays inline (the bottle one level deeper)
const inline = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(inline).join(', ')}]`
    : v && typeof v === 'object'
      ? Object.keys(v).length
        ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }`
        : '{}'
      : JSON.stringify(v)

const block = (o: object, ind: string, deep: (k: string) => boolean): string =>
  `{\n${Object.entries(o)
    .map(([k, v]) => `${ind}  ${JSON.stringify(k)}: ${deep(k) && v && typeof v === 'object' && !Array.isArray(v) ? block(v as object, `${ind}  `, deep) : inline(v)}`)
    .join(',\n')}\n${ind}}`

export const formatBeer = (b: Beer): string => `  ${block(b, '  ', (k) => k === 'bottle')}`

/** beers.en.json style: nested objects as blocks, arrays inline. */
export const formatEnglish = (en: EnglishFile): string => `${block(en, '', () => true)}\n`
