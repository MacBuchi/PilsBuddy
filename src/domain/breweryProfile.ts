import { haversineKm } from './geo'
import type { LatLon } from './geo'
import type { Country, RegionalBrewery } from './regionalBeer'

/**
 * Brewery profile (R10) for the ~90 % of breweries open data knows no beer of: the styles that are typical
 * where it brews – from its name, else its region, else its country. Never a beer, never a taste value:
 * the UI shows it as „Stil-Schätzung“ for the region, not as a claim about the brewery.
 *
 * Regions come from the coordinates (many breweries have no postcode): beer cities as circles, Bavaria as a
 * coarse outline, split into Franken and Altbayern. Deterministic, styles are keys of STYLE_PROFILES.
 */

export type ProfileRegion =
  | 'koeln'
  | 'duesseldorf'
  | 'bamberg'
  | 'dortmund'
  | 'leipzig'
  | 'goslar'
  | 'berlin'
  | 'muenchen'
  | 'franken'
  | 'altbayern'
  | 'norden'

export interface BreweryProfile {
  /** null = only the country is known to be typical (or the name told it). */
  region: ProfileRegion | null
  country: Country
  /** Typical styles, most typical first, at most 3. */
  styles: string[]
  /** What the styles come from: the brewery's own name beats its region beats its country. */
  basis: 'name' | 'region' | 'country'
}

/** Beer cities: radius in km, nearest centre wins where two overlap (Köln / Düsseldorf). */
const CITIES: readonly { region: ProfileRegion; at: LatLon; km: number; styles: string[] }[] = [
  { region: 'koeln', at: { lat: 50.938, lon: 6.957 }, km: 25, styles: ['Kölsch'] },
  { region: 'duesseldorf', at: { lat: 51.227, lon: 6.774 }, km: 20, styles: ['Altbier', 'Pils'] },
  { region: 'dortmund', at: { lat: 51.514, lon: 7.468 }, km: 20, styles: ['Export', 'Pils'] },
  { region: 'bamberg', at: { lat: 49.892, lon: 10.887 }, km: 25, styles: ['Rauchbier', 'Kellerbier', 'Lager'] },
  { region: 'leipzig', at: { lat: 51.34, lon: 12.375 }, km: 20, styles: ['Gose', 'Pils'] },
  { region: 'goslar', at: { lat: 51.906, lon: 10.428 }, km: 15, styles: ['Gose', 'Pils'] },
  { region: 'berlin', at: { lat: 52.52, lon: 13.405 }, km: 30, styles: ['Berliner Weisse', 'Pils'] },
  { region: 'muenchen', at: { lat: 48.137, lon: 11.575 }, km: 30, styles: ['Helles', 'Weißbier', 'Märzen'] },
]

/** Bavaria, coarse (lon, lat) – good to a few km, which is all a „typically brewed here“ needs. */
const BAVARIA: readonly (readonly [number, number])[] = [
  [9.0, 50.1], [9.5, 50.25], [9.9, 50.45], [10.45, 50.4], [10.85, 50.25], [11.25, 50.48], [11.9, 50.42],
  [12.25, 50.25], [12.1, 50.0], [12.5, 49.7], [12.95, 49.35], [13.4, 49.05], [13.85, 48.75], [13.75, 48.5],
  [13.45, 48.55], [12.95, 48.2], [12.75, 47.67], [13.05, 47.5], [12.75, 47.63], [12.2, 47.6], [11.6, 47.58],
  [11.1, 47.4], [10.45, 47.55], [10.18, 47.27], [9.95, 47.55], [9.6, 47.53], [9.97, 47.75], [10.1, 48.0],
  [10.15, 48.5], [10.45, 48.95], [10.25, 49.35], [10.1, 49.5], [9.8, 49.6], [9.35, 49.65], [9.1, 49.75],
]

const REGION_STYLES: Record<'franken' | 'altbayern' | 'norden', string[]> = {
  franken: ['Kellerbier', 'Lager', 'Landbier'],
  altbayern: ['Helles', 'Weißbier', 'Dunkles'],
  norden: ['Pils', 'Export'],
}

const COUNTRY_STYLES: Record<Country, string[]> = {
  DE: ['Pils', 'Export', 'Weißbier'],
  AT: ['Märzen', 'Zwickel', 'Lager'],
  CH: ['Lager', 'Helles', 'Weißbier'],
  US: ['IPA', 'Pale Ale', 'American Lager'],
  CA: ['Lager', 'Pale Ale', 'IPA'],
}

/** Only names that spell out a style – „Klosterbrauerei“ says nothing about what is brewed today. */
const NAME_HINTS: readonly [RegExp, string][] = [
  [/rauchbier|schlenkerla/, 'Rauchbier'],
  [/k(ö|oe)lsch/, 'Kölsch'],
  [/altbier/, 'Altbier'],
  [/\bgose(\b|brauerei|nschenke)/, 'Gose'],
  [/wei(ß|ss)br(ä|ae)u|weizen|wei(ß|ss)bier|weisse\b/, 'Weißbier'],
  [/kellerbier|kellerbr(ä|ae)u/, 'Kellerbier'],
]

function inPolygon(p: LatLon, poly: readonly (readonly [number, number])[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > p.lat !== yj > p.lat && p.lon < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** The beer region a point lies in (Germany only), or null. */
export function profileRegion(p: LatLon, country: Country): ProfileRegion | null {
  if (country !== 'DE') return null
  let best: { region: ProfileRegion; d: number } | null = null
  for (const c of CITIES) {
    const d = haversineKm(p, c.at)
    if (d <= c.km && (!best || d < best.d)) best = { region: c.region, d }
  }
  if (best) return best.region
  if (inPolygon(p, BAVARIA)) {
    // Franken: north of ~49°, minus the Oberpfalz east of 11.55° below 49.9°
    return p.lat >= 49.0 && (p.lon < 11.55 || p.lat >= 49.9) ? 'franken' : 'altbayern'
  }
  return p.lat >= 52.3 ? 'norden' : null
}

function regionStyles(region: ProfileRegion): string[] {
  return CITIES.find((c) => c.region === region)?.styles ?? REGION_STYLES[region as keyof typeof REGION_STYLES]
}

export function breweryProfile(b: Pick<RegionalBrewery, 'name' | 'lat' | 'lon' | 'country'>): BreweryProfile {
  const region = profileRegion(b, b.country)
  const around = region ? regionStyles(region) : COUNTRY_STYLES[b.country]
  const name = b.name.toLowerCase()
  const fromName = NAME_HINTS.find(([re]) => re.test(name))?.[1] ?? null
  const styles = (fromName ? [fromName, ...around.filter((s) => s !== fromName)] : around).slice(0, 3)
  return { region, country: b.country, styles, basis: fromName ? 'name' : region ? 'region' : 'country' }
}
