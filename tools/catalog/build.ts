// Regional catalogue (R1): raw downloads → tools/catalog/out/*.sql (idempotent import) + report.
//   npm run catalog:build                       raw/ from the catalog workflow artifact
//   npm run catalog:build -- --raw <dir> --out <dir> [--min-breweries 1000]
// Apply locally:  for f in tools/catalog/out/*.sql; do psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done
// Apply live (after OK): the same loop with `supabase db query --linked -f "$f"` (see supabase/README.md).
/// <reference types="node" />
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTRIES, importSql, mainBeers, mergeBreweries, parsePlaces } from './merge'
import type { Country, OffRow, OsmRow, WikidataBeerRow, WikidataRow } from './merge'

const here = dirname(fileURLToPath(import.meta.url))
const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const RAW = arg('raw') ?? join(here, 'raw')
const OUT = arg('out') ?? join(here, 'out')
// a broken download must not unpublish half the catalogue
const MIN_BREWERIES = Number(arg('min-breweries') ?? 1000)

function read<T>(name: string): T {
  const p = join(RAW, name)
  if (!existsSync(p)) throw new Error(`missing ${p} – download the catalog-raw artifact first`)
  return JSON.parse(readFileSync(p, 'utf8')) as T
}
const perCountry = <T>(prefix: string) =>
  Object.fromEntries(COUNTRIES.map((c) => [c, read<T[]>(`${prefix}-${c}.json`)])) as Record<Country, T[]>

const breweries = mergeBreweries(perCountry<OsmRow>('osm'), perCountry<WikidataRow>('wikidata'))
if (breweries.length < MIN_BREWERIES) throw new Error(`only ${breweries.length} breweries (< ${MIN_BREWERIES}) – incomplete download?`)

const offSeen = new Set<string>()
const off = COUNTRIES.flatMap((c) => read<OffRow[]>(`off-${c}.json`)).filter((p) => !offSeen.has(p.code) && offSeen.add(p.code))
const wdBeers = existsSync(join(RAW, 'wikidata-beers.json')) ? read<WikidataBeerRow[]>('wikidata-beers.json') : []
const beers = mainBeers(off, breweries, wdBeers)

const places = COUNTRIES.flatMap((c) => {
  const p = join(RAW, `geonames-${c}.txt`)
  return existsSync(p) ? parsePlaces(readFileSync(p, 'utf8'), c) : []
})

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const f of importSql(breweries, beers, places)) writeFileSync(join(OUT, f.name), f.sql)

const count = <T>(xs: T[], key: (x: T) => string) =>
  Object.entries(xs.reduce<Record<string, number>>((m, x) => ((m[key(x)] = (m[key(x)] ?? 0) + 1), m), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(' · ')
const withBeers = new Set(beers.map((b) => b.breweryId)).size
const report = [
  `Brauereien: ${breweries.length} (${count(breweries, (b) => b.country)}) · Quellen: ${count(breweries, (b) => b.sources.join('+'))}`,
  `  mit Gründungsjahr ${breweries.filter((b) => b.founded).length} · mit Ort ${breweries.filter((b) => b.city).length} · mit Website ${breweries.filter((b) => b.website).length}`,
  `Open-Food-Facts-Biere: ${off.length} · Wikidata-Biere: ${wdBeers.length} → Hauptbiere: ${beers.length} bei ${withBeers} Brauereien (${Math.round((withBeers / breweries.length) * 100)} %)`,
  `  Stile: ${count(beers, (b) => b.style ?? '—')}`,
  `  Quellen: ${count(beers, (b) => String(b.source))} (1 = OFF, 2 = Wikidata)`,
  `  mit ABV ${beers.filter((b) => b.abv != null).length} · mit Gebinde ${beers.filter((b) => b.pack).length}`,
  `Postleitzahlen: ${places.length} (${count(places, (p) => p.country)})`,
  `SQL: ${readdirSync(OUT).length} Dateien in ${OUT}`,
].join('\n')
writeFileSync(join(OUT, 'report.txt'), report + '\n')
console.log(report)
