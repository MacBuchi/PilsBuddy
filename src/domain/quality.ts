import type { Beer, Quality } from './types'

/**
 * V1/V4 – how well a beer is backed. Curated beers (beers.json, DB table `beers`) were researched by hand with sources: 3.
 * Regional beers carry the level the catalogue pipeline checked (tools/catalog/merge.ts `beerQuality`, 3 when all data
 * agree across sources); rows from before V1 or cached without it count as 1 („gefunden“).
 */
export function qualityOf(beer: Pick<Beer, 'regional' | 'quality'>): Quality {
  return beer.regional ? (beer.quality ?? 1) : 3
}

/** „fraglich“ beers stay in the finder and the library, never in the swipe deck. */
export const swipeable = (beer: Pick<Beer, 'regional' | 'quality'>) => qualityOf(beer) > 0
