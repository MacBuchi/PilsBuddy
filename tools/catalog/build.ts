// Regional catalogue (R1): raw downloads → tools/catalog/out/*.sql (idempotent import) + report.
//   npm run catalog:build                       raw/ from the catalog workflow artifact
//   npm run catalog:build -- --raw <dir> --out <dir> [--min-breweries 1]   (default: per country, countries.json)
//   npm run catalog:diff                        out/next.json vs. the live catalogue → out/diff.md + diff.tsv (R7)
// Apply locally:  for f in tools/catalog/out/*.sql; do psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done
// Apply live (after OK): the same loop with `supabase db query --linked -f "$f"` (see supabase/README.md).
/// <reference types="node" />
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import COUNTRY_TABLE from './countries.json'
import { COUNTRIES, COUNTRY_INFO, importSql, mainBeers, mergeBreweries, parseOpenbeer, parsePlaces, tooFew } from './merge'
import { beerRow, breweryRow } from './diff'
import { beerName, breweryKey, guestBeer } from './web'
import { plausibilityReport } from './plausible'
import type { PlausibilityNote } from './plausible'
import type { Country, ObdbRow, OffRow, OpenbeerRow, OsmRow, WebRow, WikidataBeerRow, WikidataRow } from './merge'

const here = dirname(fileURLToPath(import.meta.url))
const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const RAW = arg('raw') ?? join(here, 'raw')
const OUT = arg('out') ?? join(here, 'out')
// a broken download must not unpublish half the catalogue – every country is built in every run, each needs its minimum
const MIN_BREWERIES = arg('min-breweries') != null ? Number(arg('min-breweries')) : undefined

function read<T>(name: string): T {
  const p = join(RAW, name)
  if (!existsSync(p)) throw new Error(`missing ${p} – download the catalog-raw artifact first`)
  return JSON.parse(readFileSync(p, 'utf8')) as T
}
const perCountry = <T>(prefix: string) =>
  Object.fromEntries(COUNTRIES.map((c) => [c, read<T[]>(`${prefix}-${c}.json`)])) as Record<Country, T[]>
const places = COUNTRIES.flatMap((c) => {
  const p = join(RAW, `geonames-${c}.txt`)
  return existsSync(p) ? parsePlaces(readFileSync(p, 'utf8'), c) : []
})
// Open Brewery DB covers only some countries (countries.json `obdb`)
const obdb = Object.fromEntries(
  COUNTRIES.filter((c) => 'obdb' in COUNTRY_TABLE[c]).map((c) => [c, read<ObdbRow[]>(`obdb-${c}.json`)]),
) as Partial<Record<Country, ObdbRow[]>>

const breweries = mergeBreweries(perCountry<OsmRow>('osm'), perCountry<WikidataRow>('wikidata'), obdb, places)
const missing = tooFew(breweries, MIN_BREWERIES)
if (missing.length) throw new Error(`too few breweries (${missing.join(', ')}) – incomplete download?`)

// one row per product, with every catalogue country selling it (V10: a product not sold in the brewery's country
// needs the exact brewery name)
const offByCode = new Map<string, OffRow & { countries: Country[] }>()
for (const c of COUNTRIES)
  for (const p of read<OffRow[]>(`off-${c}.json`)) {
    const seen = offByCode.get(p.code)
    if (seen) seen.countries.push(c)
    else offByCode.set(p.code, { ...p, countries: [c] })
  }
const off = [...offByCode.values()]
// V10: beers sold only in other countries (export beers of our breweries) – matched by the exact brewery name only
const offAbroad = existsSync(join(RAW, 'off-other.json'))
  ? read<OffRow[]>('off-other.json').filter((p) => !offByCode.has(p.code)).map((p) => ({ ...p, abroad: true }))
  : []
const wdBeers = existsSync(join(RAW, 'wikidata-beers.json')) ? read<WikidataBeerRow[]>('wikidata-beers.json') : []
// openbeer/beer.db clones (raw/openbeer/<repo>/…): beer lists only, no award lists, setups or drafts; the North
// American repos list breweries under their region („- New York City“), so only their beers files count there
const OPENBEER = join(RAW, 'openbeer')
const BEERS_ONLY = new Set(COUNTRIES.filter((c) => COUNTRY_INFO[c].lang !== 'de').flatMap((c) => (COUNTRY_TABLE[c] as { openbeer?: string[] }).openbeer ?? []))
const openbeer: OpenbeerRow[] = []
const walk = (dir: string, rel: string): void => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || /^(setups|sandbox|attic|maps)$/.test(e.name)) continue
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) walk(join(dir, e.name), r)
    else if (e.name.endsWith('.txt') && !/winners|links|GEO/i.test(e.name)) {
      const [repo, ...path] = r.split('/')
      if (BEERS_ONLY.has(repo) && !/^(ii--)?beers[\w-]*\.txt$/.test(e.name)) continue
      openbeer.push(...parseOpenbeer(readFileSync(join(dir, e.name), 'utf8'), `${repo}/blob/master/${path.join('/')}`))
    }
  }
}
if (existsSync(OPENBEER)) walk(OPENBEER, '')
// brewery websites (crawl.ts, one file per shard); names re-checked with the current filters (in the brewery
// country's language), so a stricter beerName() needs no new crawl; guest beers of other breweries are dropped
const langOf = new Map(breweries.map((b) => [b.id, COUNTRY_INFO[b.country].lang]))
const breweryOf = new Map(breweries.map((b) => [b.id, b]))
const breweryKeys = new Set(breweries.map((b) => breweryKey(b.name)))
const web = readdirSync(RAW)
  .filter((f) => /^web-\d+\.json$/.test(f))
  .flatMap((f) => read<WebRow[]>(f))
  .flatMap((w): WebRow[] => {
    const beer = beerName(w.name, w.abv, langOf.get(w.breweryId))
    // V9: drinks menus of brewpubs also list other breweries' beers
    return beer && !guestBeer(beer.name, breweryOf.get(w.breweryId)?.name ?? '', breweryOf.get(w.breweryId)?.website ?? '', breweryKeys) ? [{ ...w, ...beer }] : []
  })
const notes: PlausibilityNote[] = []
const beers = mainBeers([...off, ...offAbroad], breweries, wdBeers, openbeer, web, notes)

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const f of importSql(breweries, beers, places)) writeFileSync(join(OUT, f.name), f.sql)
// R7: what compare.ts diffs against the live catalogue (not imported – the import reads *.sql only)
writeFileSync(join(OUT, 'next.json'), JSON.stringify({ breweries: breweries.map(breweryRow), beers: beers.map(beerRow) }))

const count = <T>(xs: T[], key: (x: T) => string) =>
  Object.entries(xs.reduce<Record<string, number>>((m, x) => ((m[key(x)] = (m[key(x)] ?? 0) + 1), m), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(' · ')
const withBeers = new Set(beers.map((b) => b.breweryId)).size
const countryOf = new Map(breweries.map((b) => [b.id, b.country]))
const report = [
  `Brauereien: ${breweries.length} (${count(breweries, (b) => b.country)}) · Quellen: ${count(breweries, (b) => b.sources.join('+'))}`,
  `  mit Gründungsjahr ${breweries.filter((b) => b.founded).length} · mit Ort ${breweries.filter((b) => b.city).length} · mit Website ${breweries.filter((b) => b.website).length}`,
  `Open-Brewery-DB-Zeilen: ${Object.values(obdb).flat().length} · Open-Food-Facts-Biere: ${off.length} (+ ${offAbroad.length} nur im Ausland) · Wikidata-Biere: ${wdBeers.length} · openbeer-Biere: ${openbeer.length} · Website-Biere: ${web.length} → Hauptbiere: ${beers.length} bei ${withBeers} Brauereien (${Math.round((withBeers / breweries.length) * 100)} %)`,
  `  Stile: ${count(beers, (b) => b.style ?? '—')}`,
  `  Quellen: ${count(beers, (b) => String(b.source))} (1 = OFF, 2 = Wikidata, 3 = Website, 4 = openbeer)`,
  `  je Land: ${COUNTRIES.map((c) => `${c} ${beers.filter((b) => countryOf.get(b.breweryId) === c).length} bei ${new Set(beers.filter((b) => countryOf.get(b.breweryId) === c).map((b) => b.breweryId)).size}`).join(' · ')}`,
  `  mit ABV ${beers.filter((b) => b.abv != null).length} · mit Gebinde ${beers.filter((b) => b.pack).length}`,
  `  Qualität (V4): geprüft ${beers.filter((b) => b.quality === 3).length} · bestätigt ${beers.filter((b) => b.quality === 2).length} · gefunden ${beers.filter((b) => b.quality === 1).length} · fraglich ${beers.filter((b) => b.quality === 0).length}`,
  ...plausibilityReport(notes),
  `Postleitzahlen: ${places.length} (${count(places, (p) => p.country)})`,
  `SQL: ${readdirSync(OUT).filter((f) => f.endsWith('.sql')).length} Dateien in ${OUT}`,
].join('\n')
writeFileSync(join(OUT, 'report.txt'), report + '\n')
console.log(report)
