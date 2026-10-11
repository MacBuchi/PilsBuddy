// R7: the build in out/next.json (npm run catalog:build) against the live catalogue → out/diff.md + out/diff.tsv.
//   npm run catalog:diff                          live = the public API (published rows, publishable key, read-only)
//   npm run catalog:diff -- --live <file.json>    live = a saved { breweries, beers } (tests, offline)
//   [--out <dir>]  where next.json is read and the report written (default tools/catalog/out)
/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { catalogDiff, diffMarkdown, diffTsv } from './diff'
import type { BeerRow, BreweryRow } from './diff'
import { COUNTRIES } from './merge'

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const OUT = arg('out') ?? join(dirname(fileURLToPath(import.meta.url)), 'out')
const API = process.env.SUPABASE_URL ?? 'https://rwqpljpnotnyovvuxjgl.supabase.co'
const KEY = process.env.SUPABASE_KEY ?? 'sb_publishable_X2teAee681xX1mw4hvPVLQ_I_XqNsjV'
const PAGE = 1000 // the API's max_rows

/** All published rows of a table, page by page in id order (stable while nobody imports). */
async function all<T>(table: string, select: string): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE) {
    const url = `${API}/rest/v1/${table}?select=${select}&published=eq.true&order=id.asc&limit=${PAGE}&offset=${offset}`
    let res: Response | null = null
    for (let attempt = 1; attempt <= 3 && !res?.ok; attempt++) {
      if (attempt > 1) await new Promise((r) => setTimeout(r, 2000 * attempt))
      res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(30_000) })
    }
    if (!res?.ok) throw new Error(`${table}: HTTP ${res?.status} at offset ${offset}`)
    const page = (await res.json()) as T[]
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

interface LiveBeer {
  id: string
  brewery_id: string
  name: string
  style: string | null
  abv: number | null
  source: number
}

async function live(): Promise<{ breweries: BreweryRow[]; beers: BeerRow[] }> {
  const file = arg('live')
  if (file) return JSON.parse(readFileSync(file, 'utf8')) as { breweries: BreweryRow[]; beers: BeerRow[] }
  const breweries = await all<BreweryRow>('breweries', 'id,name,lat,lon,city,postcode,country,website,founded')
  const beers = (await all<LiveBeer>('regional_beers', 'id,brewery_id,name,style,abv,source')).map(
    ({ brewery_id, ...b }): BeerRow => ({ ...b, breweryId: brewery_id }),
  )
  return { breweries, beers }
}

const next = JSON.parse(readFileSync(join(OUT, 'next.json'), 'utf8')) as { breweries: BreweryRow[]; beers: BeerRow[] }
const diff = catalogDiff(COUNTRIES, await live(), next)
const md = diffMarkdown(diff)
writeFileSync(join(OUT, 'diff.md'), md)
writeFileSync(join(OUT, 'diff.tsv'), diffTsv(diff))
console.log(md)
// the workflow reads this to warn in the PR title
if (diff.some((d) => d.blocked)) console.error(`blocked: ${diff.filter((d) => d.blocked).map((d) => d.country).join(' ')}`)
