import type { Beer, Rating, Ratings } from './types'

/**
 * Bierbibliothek (R8): every beer the app knows, searchable and filterable – by name/brewery/place,
 * style group, alcohol and the user's own rating. Pure and deterministic; the screen only renders.
 */

export type StyleGroup = 'hell' | 'dunkel' | 'weizen' | 'hopfen' | 'alkoholfrei'

export const STYLE_GROUPS: readonly StyleGroup[] = ['hell', 'dunkel', 'weizen', 'hopfen', 'alkoholfrei']

/** Canonical styles (styleProfile.ts) by group; anything else (unknown style) is in no group. */
const GROUP_OF_STYLE: Record<string, StyleGroup> = {
  Pils: 'hell',
  Helles: 'hell',
  Lager: 'hell',
  Export: 'hell',
  Landbier: 'hell',
  Kellerbier: 'hell',
  Zwickel: 'hell',
  Kölsch: 'hell',
  'Abbey Blonde': 'hell',
  'Belgian Strong Ale': 'hell',
  Radler: 'hell',
  'American Lager': 'hell',
  'Light Lager': 'hell',
  'Cream Ale': 'hell',
  'Blonde Ale': 'hell',
  Saison: 'hell',
  Tripel: 'hell',
  Märzen: 'dunkel',
  Dunkles: 'dunkel',
  Schwarzbier: 'dunkel',
  Bock: 'dunkel',
  Doppelbock: 'dunkel',
  Rauchbier: 'dunkel',
  Altbier: 'dunkel',
  Amber: 'dunkel',
  Stout: 'dunkel',
  Porter: 'dunkel',
  Trappist: 'dunkel',
  'California Common': 'dunkel',
  'Brown Ale': 'dunkel',
  'Scotch Ale': 'dunkel',
  'Milk Stout': 'dunkel',
  'Imperial Stout': 'dunkel',
  Barleywine: 'dunkel',
  Dubbel: 'dunkel',
  Quadrupel: 'dunkel',
  Weißbier: 'weizen',
  'Dunkles Weißbier': 'weizen',
  'Berliner Weisse': 'weizen',
  Gose: 'weizen',
  'Wheat Ale': 'weizen',
  Witbier: 'weizen',
  // the sour family sits with Berliner Weisse and Gose
  'Sour Ale': 'weizen',
  'Pale Ale': 'hopfen',
  IPA: 'hopfen',
  'Double IPA': 'hopfen',
  'Hazy IPA': 'hopfen',
  Bitter: 'hopfen',
  Alkoholfrei: 'alkoholfrei',
  'Alkoholfreies Weißbier': 'alkoholfrei',
}

/** Alcohol-free by law in Germany: at most 0.5 %; anything under 1.2 % is sold as „alkoholarm“ at best. */
const ALCOHOL_FREE_MAX = 0.5

export function styleGroup(beer: Pick<Beer, 'style' | 'abv'>): StyleGroup | null {
  if (beer.abv <= ALCOHOL_FREE_MAX) return 'alkoholfrei'
  return GROUP_OF_STYLE[beer.style] ?? null
}

export type AbvBand = 'light' | 'normal' | 'strong'
export const ABV_BANDS: readonly AbvBand[] = ['light', 'normal', 'strong']

export function abvBand(abv: number): AbvBand {
  return abv < 4.5 ? 'light' : abv <= 5.5 ? 'normal' : 'strong'
}

/** `unrated` = never rated; the five ratings as they are (UNKNOWN is a rating too). */
export type RatingFilter = Rating | 'unrated'

export interface LibraryFilter {
  query: string
  group: StyleGroup | null
  abv: AbvBand | null
  rating: RatingFilter | null
}

export const NO_FILTER: LibraryFilter = { query: '', group: null, abv: null, rating: null }

/** Lower case, no accents, ß → ss: „Bräu“ finds „Brau“ and „Weissbier“ finds „Weißbier“. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Every word of the query must appear in name, brewery, place or style. */
export function matchesQuery(beer: Beer, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = fold([beer.fullName, beer.name, beer.brewery, beer.region, beer.country, beer.style].join(' '))
  return words.every((w) => hay.includes(w))
}

export function matchesFilter(beer: Beer, f: LibraryFilter, ratings: Ratings): boolean {
  if (f.group && styleGroup(beer) !== f.group) return false
  if (f.abv && abvBand(beer.abv) !== f.abv) return false
  if (f.rating) {
    const r = ratings[beer.id]?.rating
    if (f.rating === 'unrated' ? !!r : r !== f.rating) return false
  }
  return matchesQuery(beer, f.query)
}

/** Matching beers, sorted by name (German collation), ties by id – stable for the same input. */
export function filterLibrary(beers: readonly Beer[], f: LibraryFilter, ratings: Ratings): Beer[] {
  return beers
    .filter((b) => matchesFilter(b, f, ratings))
    .sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id))
}

/** How many beers each group would show with the other filters as they are (chip counts). */
export function groupCounts(beers: readonly Beer[], f: LibraryFilter, ratings: Ratings): Record<StyleGroup, number> {
  const out = Object.fromEntries(STYLE_GROUPS.map((g) => [g, 0])) as Record<StyleGroup, number>
  for (const b of beers) {
    const g = styleGroup(b)
    if (g && matchesFilter(b, { ...f, group: null }, ratings)) out[g]++
  }
  return out
}

/** A typed postcode (DE/US 5 digits, AT/CH 4, a Canadian FSA) – the library then looks for breweries around it. */
export { isPostcode } from './postcode'
