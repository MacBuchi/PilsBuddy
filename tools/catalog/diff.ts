// R7: what a catalogue build would change compared with the live catalogue – per country new / gone / changed
// breweries and beers, as a bounded Markdown report for the monthly PR. Pure and deterministic; compare.ts does the I/O.
import { haversineKm, MAX_DROP } from './merge'
import type { Brewery, Country, RegionalBeer } from './merge'

/** The fields a diff looks at – the live API rows (snake_case) are mapped to this in compare.ts. */
export interface BreweryRow {
  id: string
  name: string
  lat: number
  lon: number
  city: string | null
  postcode: string | null
  country: string
  website: string | null
  founded: number | null
}

export interface BeerRow {
  id: string
  breweryId: string
  name: string
  style: string | null
  abv: number | null
  /** 5 = reported in the app (R6) – never unpublished by an import */
  source: number
}

export const breweryRow = (b: Brewery): BreweryRow => ({
  id: b.id, name: b.name, lat: b.lat, lon: b.lon, city: b.city, postcode: b.postcode, country: b.country, website: b.website, founded: b.founded,
})
export const beerRow = (b: RegionalBeer): BeerRow => ({
  id: b.id, breweryId: b.breweryId, name: b.name, style: b.style, abv: b.abv, source: b.source,
})

/** A brewery counts as moved from this distance on (coordinates are rounded and re-geocoded between sources). */
export const MOVED_KM = 1

export interface Change<T> {
  before: T
  after: T
  fields: string[]
}

export interface CountryDiff {
  country: string
  breweries: { live: number; next: number; added: BreweryRow[]; removed: BreweryRow[]; changed: Change<BreweryRow>[] }
  beers: { live: number; next: number; added: BeerRow[]; removed: BeerRow[]; changed: Change<BeerRow>[] }
  /** 05-guard.sql would stop the import: the country loses more than MAX_DROP of its breweries */
  blocked: boolean
}

/** Rows the import never takes back (R6: `app-<issue>` breweries, source 5 beers) – kept out of the diff. */
const fromApp = { brewery: (b: { id: string }) => b.id.startsWith('app-'), beer: (b: { source: number }) => b.source === 5 }

function breweryFields(a: BreweryRow, b: BreweryRow): string[] {
  const f: string[] = []
  if (a.name !== b.name) f.push('Name')
  if ((a.city ?? '') !== (b.city ?? '') || (a.postcode ?? '') !== (b.postcode ?? '')) f.push('Ort')
  if (haversineKm(a, b) >= MOVED_KM) f.push('Lage')
  if ((a.website ?? '') !== (b.website ?? '')) f.push('Website')
  if ((a.founded ?? null) !== (b.founded ?? null)) f.push('Gründung')
  return f
}

function beerFields(a: BeerRow, b: BeerRow): string[] {
  const f: string[] = []
  if (a.name !== b.name) f.push('Name')
  if (a.breweryId !== b.breweryId) f.push('Brauerei')
  if ((a.style ?? '') !== (b.style ?? '')) f.push('Stil')
  if ((a.abv ?? null) !== (b.abv ?? null)) f.push('Alkohol')
  return f
}

const byName = <T extends { name: string; id: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'de') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

function diffRows<T extends { id: string; name: string }>(live: T[], next: T[], fields: (a: T, b: T) => string[]) {
  const before = new Map(live.map((r) => [r.id, r]))
  const after = new Map(next.map((r) => [r.id, r]))
  const added = next.filter((r) => !before.has(r.id)).sort(byName)
  const removed = live.filter((r) => !after.has(r.id)).sort(byName)
  const changed = next
    .flatMap((r): Change<T>[] => {
      const old = before.get(r.id)
      const f = old ? fields(old, r) : []
      return old && f.length ? [{ before: old, after: r, fields: f }] : []
    })
    .sort((a, b) => byName(a.after, b.after))
  return { live: live.length, next: next.length, added, removed, changed }
}

/** Live vs. next, per country (countries in the given order, then any other country seen live). */
export function catalogDiff(
  countries: readonly Country[],
  live: { breweries: BreweryRow[]; beers: BeerRow[] },
  next: { breweries: BreweryRow[]; beers: BeerRow[]; downloaded?: Record<string, number> },
): CountryDiff[] {
  const liveBreweries = live.breweries.filter((b) => !fromApp.brewery(b))
  const liveBeers = live.beers.filter((b) => !fromApp.beer(b))
  // a beer belongs to the country of its brewery – live or next, whichever knows it
  const countryOf = new Map([...live.breweries, ...next.breweries].map((b) => [b.id, b.country]))
  const all = [...countries, ...new Set(liveBreweries.map((b) => b.country).filter((c) => !countries.includes(c as Country)))]
  return all.map((country) => {
    const breweries = diffRows(
      liveBreweries.filter((b) => b.country === country),
      next.breweries.filter((b) => b.country === country),
      breweryFields,
    )
    const inCountry = (b: BeerRow) => countryOf.get(b.breweryId) === country
    const beers = diffRows(liveBeers.filter(inCountry), next.beers.filter(inCountry), beerFields)
    // like 05-guard.sql: what was downloaded, before breweries are hidden on purpose (V12)
    const downloaded = next.downloaded?.[country] ?? breweries.next
    return { country, breweries, beers, blocked: downloaded < breweries.live * (1 - MAX_DROP) }
  })
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0')
const esc = (s: string) => s.replace(/[|\\`*_[\]<>]/g, (c) => `\\${c}`)

/** Markdown report, at most `sample` rows per list and country – a PR body holds ≤ 65 536 characters. */
export function diffMarkdown(diff: CountryDiff[], sample = 8): string {
  const lines: string[] = []
  const blocked = diff.filter((d) => d.blocked)
  if (blocked.length) {
    lines.push(
      `> [!CAUTION]`,
      `> ${blocked.map((d) => d.country).join(', ')}: mehr als ${Math.round(MAX_DROP * 100)} % der Brauereien fehlen – ` +
        `der Import bricht dort ab (\`05-guard.sql\`). Download unvollständig? Nicht mergen, neuen Lauf starten.`,
      '',
    )
  }
  lines.push(
    '| Land | Brauereien | neu | weg | geändert | Biere | neu | weg | geändert |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  )
  for (const d of diff) {
    const b = d.breweries
    const r = d.beers
    lines.push(
      `| ${d.country}${d.blocked ? ' ⚠️' : ''} | ${b.live} → ${b.next} (${signed(b.next - b.live)}) | ${b.added.length} | ${b.removed.length} | ${b.changed.length} ` +
        `| ${r.live} → ${r.next} (${signed(r.next - r.live)}) | ${r.added.length} | ${r.removed.length} | ${r.changed.length} |`,
    )
  }
  const brewery = (b: BreweryRow) => `${esc(b.name)}${b.city ? ` (${esc(b.city)})` : ''} \`${b.id}\``
  const beer = (b: BeerRow) => `${esc(b.name)}${b.style ? ` · ${esc(b.style)}` : ''}${b.abv != null ? ` · ${b.abv} %` : ''} \`${b.id}\``
  const list = <T>(title: string, xs: T[], fmt: (x: T) => string) => {
    if (!xs.length) return
    lines.push(`- **${title}** (${xs.length}): ${xs.slice(0, sample).map(fmt).join(' · ')}${xs.length > sample ? ' · …' : ''}`)
  }
  const change = <T extends { name: string }>(fmt: (x: T) => string) => (c: Change<T>) =>
    `${fmt(c.after)} – ${c.fields.join(', ')}${c.fields.includes('Name') ? ` (vorher „${esc(c.before.name)}“)` : ''}`
  for (const d of diff) {
    const b = d.breweries
    const r = d.beers
    if (!b.added.length && !b.removed.length && !b.changed.length && !r.added.length && !r.removed.length && !r.changed.length) continue
    lines.push('', `### ${d.country}`, '')
    list('Brauereien neu', b.added, brewery)
    list('Brauereien weg', b.removed, brewery)
    list('Brauereien geändert', b.changed, change(brewery))
    list('Biere neu', r.added, beer)
    list('Biere weg', r.removed, beer)
    list('Biere geändert', r.changed, change(beer))
  }
  return lines.join('\n') + '\n'
}

/** Every change as tab-separated lines (artifact, for a closer look than the PR body allows). */
export function diffTsv(diff: CountryDiff[]): string {
  const rows = [['country', 'kind', 'change', 'id', 'name', 'fields'].join('\t')]
  const clean = (s: string) => s.replace(/[\t\n\r]/g, ' ')
  for (const d of diff) {
    for (const [kind, part] of [['brewery', d.breweries], ['beer', d.beers]] as const) {
      for (const x of part.added) rows.push([d.country, kind, 'added', x.id, clean(x.name), ''].join('\t'))
      for (const x of part.removed) rows.push([d.country, kind, 'removed', x.id, clean(x.name), ''].join('\t'))
      for (const c of part.changed) rows.push([d.country, kind, 'changed', c.after.id, clean(c.after.name), c.fields.join(',')].join('\t'))
    }
  }
  return rows.join('\n') + '\n'
}
