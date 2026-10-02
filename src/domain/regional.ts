import { COPY } from '../data/copy'
import { haversineKm } from './geo'
import type { LatLon } from './geo'
import { compatibility } from './matching'
import { toRegionalBeer } from './regionalBeer'
import type { RegionalBrewery } from './regionalBeer'
import type { Beer, TasteVector } from './types'

/**
 * Regional finder (Stufe R4): ranks the beers of nearby breweries against the user's taste.
 * Grid and distance live in geo.ts (re-exported here). Deterministic.
 */

export * from './geo'

export interface RegionalHit {
  beer: Beer
  brewery: RegionalBrewery
  pct: number
  km: number
}

export interface BreweryHit {
  brewery: RegionalBrewery
  km: number
}

export interface RegionalResult {
  /** Beers of breweries within the radius, best match first, then nearest. */
  beers: RegionalHit[]
  /** Breweries in the radius without a known beer – nearest first, no invented taste. */
  breweries: BreweryHit[]
}

/** Beers and breweries within `radiusKm` of `origin`, ranked against the user's taste. */
export function rankRegional(user: TasteVector, breweries: readonly RegionalBrewery[], origin: LatLon, radiusKm: number): RegionalResult {
  const beers: RegionalHit[] = []
  const without: BreweryHit[] = []
  const seen = new Set<string>()
  for (const brewery of breweries) {
    if (seen.has(brewery.id)) continue
    seen.add(brewery.id)
    const km = haversineKm(origin, brewery)
    if (km > radiusKm) continue
    if (!brewery.beers.length) {
      without.push({ brewery, km })
      continue
    }
    for (const row of brewery.beers) {
      const beer = toRegionalBeer(row, brewery)
      beers.push({ beer, brewery, km, pct: compatibility(user, beer.taste) })
    }
  }
  beers.sort((a, b) => b.pct - a.pct || a.km - b.km || a.beer.id.localeCompare(b.beer.id))
  without.sort((a, b) => a.km - b.km || a.brewery.id.localeCompare(b.brewery.id))
  return { beers, breweries: without }
}

/** „800 m“, „4,2 km“, „37 km“ – with a no-break space, so the unit never wraps alone. */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.max(100, Math.round(km * 10) * 100)}\u00a0m`
  if (km < 10) return `${km.toFixed(1).replace('.', COPY.app.decimal)}\u00a0km`
  return `${Math.round(km)}\u00a0km`
}

/** Directions to the brewery – only its coordinates go into the link, never the user's position. */
export function routeUrl(p: LatLon): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(5)},${p.lon.toFixed(5)}`
}
