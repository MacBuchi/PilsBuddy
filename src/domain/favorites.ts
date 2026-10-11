import { fold } from './library'
import type { Beer, Ratings } from './types'

/**
 * V3 – „Was trinkst du gern?“ before the reference set: the user names a few favourites, each counts as „Mag ich“.
 * Pure: ranking of the curated beers for a query; the screen adds regional ones from the API.
 */
export const MAX_FAVORITES = 5
export const FAVORITE_HITS = 6

/** How well a beer's name answers the query: whole name > name start > word start > anywhere (incl. brewery). */
function score(beer: Beer, words: string[]): number {
  const name = fold(beer.fullName)
  const short = fold(beer.name)
  const hay = fold([beer.fullName, beer.name, beer.brewery, beer.style].join(' '))
  if (!words.every((w) => hay.includes(w))) return 0
  const q = words.join(' ')
  if (name === q || short === q) return 4
  if (name.startsWith(q) || short.startsWith(q)) return 3
  if (words.every((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(name))) return 2
  return 1
}

/** Curated beers for the favourites search, best first; ties by name, then id. Empty for fewer than 2 letters. */
export function searchFavorites(beers: readonly Beer[], query: string, limit = FAVORITE_HITS): Beer[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.join('').length < 2) return []
  return beers
    .map((b) => ({ b, s: score(b, words) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.b.name.localeCompare(y.b.name, 'de') || x.b.id.localeCompare(y.b.id))
    .slice(0, limit)
    .map((x) => x.b)
}

/** The favourites as ratings: „Mag ich“ for each, never overwriting what the user already said about a beer. */
export function favoriteRatings(ids: readonly string[], ratings: Ratings): string[] {
  return [...new Set(ids)].filter((id) => !ratings[id]).slice(0, MAX_FAVORITES)
}
