// Brewery websites → raw/web-<shard>.json (R1b). Runs on GitHub Actions (catalog-web.yml), not locally.
//   npx tsx tools/catalog/crawl.ts [--shard 0 --shards 1] [--limit 50] [--out tools/catalog/raw]
// Breweries come from the live catalogue (public API, published rows with a website), so every beer is
// already tied to its brewery. Polite: robots.txt, own User-Agent, ≤ 4 pages per site, 1 s between pages.
/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beerLinks, CRAWLER_UA, extractBeers, robotsAllows } from './web'

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const SHARD = Number(arg('shard') ?? 0)
const SHARDS = Number(arg('shards') ?? 1)
const LIMIT = Number(arg('limit') ?? Infinity)
const OUT = arg('out') ?? join(dirname(fileURLToPath(import.meta.url)), 'raw')
const API = process.env.SUPABASE_URL ?? 'https://rwqpljpnotnyovvuxjgl.supabase.co'
const KEY = process.env.SUPABASE_KEY ?? 'sb_publishable_X2teAee681xX1mw4hvPVLQ_I_XqNsjV'
const PARALLEL = 8

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(url: string): Promise<{ url: string; status: number; html: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': CRAWLER_UA, Accept: 'text/html,text/plain;q=0.9', 'Accept-Language': 'de,en;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !/text\/(html|plain)/.test(type)) return { url: res.url, status: res.status, html: '' }
    const html = (await res.text()).slice(0, 2_000_000)
    return { url: res.url, status: res.status, html }
  } catch {
    return null
  }
}

interface Row {
  breweryId: string
  path: string
  name: string
  abv: number | null
}

const breweries: { id: string; name: string; website: string }[] = []
for (let from = 0; ; from += 1000) {
  const res = await fetch(`${API}/rest/v1/breweries?select=id,name,website&website=not.is.null&order=id&offset=${from}&limit=1000`, {
    headers: { apikey: KEY },
  })
  if (!res.ok) throw new Error(`breweries: ${res.status}`)
  const page = (await res.json()) as typeof breweries
  breweries.push(...page)
  if (page.length < 1000) break
}

// one visit per site, even if several breweries share it
const sites = new Map<string, string[]>()
for (const b of breweries) {
  let origin: string
  try {
    origin = new URL(b.website).origin
  } catch {
    continue
  }
  sites.set(origin, [...(sites.get(origin) ?? []), b.id])
}
const mine = [...sites].filter((_, i) => i % SHARDS === SHARD).slice(0, LIMIT)
console.log(`${breweries.length} breweries with website, ${sites.size} sites, shard ${SHARD}/${SHARDS}: ${mine.length}`)

const rows: Row[] = []
const stats = { sites: 0, unreachable: 0, robots: 0, withBeers: 0, pages: 0 }

async function crawl(origin: string, ids: string[]) {
  stats.sites++
  const robots = await get(`${origin}/robots.txt`)
  const robotsTxt = robots && robots.status === 200 ? robots.html : null
  const allowed = (u: string) => robotsAllows(robotsTxt, new URL(u).pathname)
  if (!allowed(`${origin}/`)) {
    stats.robots++
    return
  }
  await sleep(1000)
  const home = await get(`${origin}/`)
  if (!home?.html) {
    stats.unreachable++
    return
  }
  const pages = [home]
  for (const link of beerLinks(home.html, home.url).filter(allowed)) {
    await sleep(1000)
    const page = await get(link)
    if (page?.html) pages.push(page)
  }
  stats.pages += pages.length
  const found = new Map<string, Row>()
  for (const page of pages) {
    const path = new URL(page.url).pathname + new URL(page.url).search
    for (const beer of extractBeers(page.html))
      for (const breweryId of ids) {
        const key = `${breweryId}|${beer.name.toLowerCase()}`
        const prev = found.get(key)
        if (!prev || (prev.abv == null && beer.abv != null)) found.set(key, { breweryId, path, ...beer })
      }
  }
  if (found.size) stats.withBeers++
  rows.push(...found.values())
}

const queue = [...mine]
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) await crawl(...next)
  }),
)

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, `web-${SHARD}.json`), JSON.stringify(rows, null, 1))
console.log(
  `sites ${stats.sites} · robots.txt says no ${stats.robots} · unreachable ${stats.unreachable} · pages ${stats.pages} · sites with beers ${stats.withBeers} · beers ${rows.length}`,
)
