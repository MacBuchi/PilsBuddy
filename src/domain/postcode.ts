/**
 * Typed postcodes for the regional search (Stufe R, N4): DE/US five digits, AT/CH four, Canada as its FSA – the
 * first three characters. A full Canadian postcode or a US ZIP+4 is cut down here, on the device, so the lookup
 * never sends more than the coarse area.
 */

export type PlaceCountry = 'DE' | 'AT' | 'CH' | 'CA' | 'US'

// FSAs never start with D, F, I, O, Q, U, W or Z
const FSA = /^([ABCEGHJ-NPRSTVXY][0-9][A-Z])(?:\s?[0-9][A-Z][0-9])?$/
const DIGITS = /^([0-9]{4,5})(?:-[0-9]{4})?$/

/** „74906“ → „74906“, „k1a 0b1“ → „K1A“, „90210-1234“ → „90210“; anything else null. */
export function parsePostcode(q: string): string | null {
  const t = q.trim().toUpperCase()
  const d = DIGITS.exec(t)
  if (d && (d[1].length === 5 || !t.includes('-'))) return d[1]
  return FSA.exec(t)?.[1] ?? null
}

export const isPostcode = (q: string) => parsePostcode(q) !== null

/** Country order for an ambiguous code (10115 is Berlin and Schenectady): the browser's region first, then DACH. */
export function preferredCountries(locale: string): PlaceCountry[] {
  const region = /[-_]([a-z]{2})\b/i.exec(locale)?.[1]?.toUpperCase()
  const base: PlaceCountry[] = ['DE', 'AT', 'CH', 'US', 'CA']
  return region && (base as string[]).includes(region) ? [region as PlaceCountry, ...base.filter((c) => c !== region)] : base
}

/** One hit per country, the preferred country first. */
export function orderPlaces<T extends { country: PlaceCountry }>(places: readonly T[], preferred: readonly PlaceCountry[]): T[] {
  const seen = new Set<PlaceCountry>()
  const first = places.filter((p) => !seen.has(p.country) && seen.add(p.country))
  const rank = (c: PlaceCountry) => (preferred.includes(c) ? preferred.indexOf(c) : preferred.length)
  return first.sort((a, b) => rank(a.country) - rank(b.country))
}
