// Brewery websites → raw/web-<shard>.json (R1b). Runs on GitHub Actions (catalog-web.yml), not locally.
//   npx tsx tools/catalog/crawl.ts [--shard 0 --shards 1] [--limit 50] [--out tools/catalog/raw]
// Breweries come from the live catalogue (public API, published rows with a website), so every beer is
// already tied to its brewery; the brewery's country picks the language profile and Accept-Language. Polite: robots.txt, own User-Agent, ≤ 4 pages per site, 1 s between pages.
// V8: every site also gets a reason (diagnose.ts) in raw/web-diag-<shard>.json – why it gave beers or none.
/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import COUNTRY_TABLE from './countries.json'
import { diagnoseSite } from './diagnose'
import type { Fetched, SiteRow } from './diagnose'
import { beerLinks, CRAWLER_UA, extractBeers, robotsAllows } from './web'
import type { Lang } from './web'

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

/** Pages in the brewery's language – Canada in English, French second (Québec). */
const ACCEPT_LANGUAGE: Record<string, string> = { DE: 'de,en;q=0.5', AT: 'de-AT,de,en;q=0.5', CH: 'de-CH,de,fr;q=0.7,en;q=0.5', CA: 'en-CA,en,fr-CA;q=0.8,fr;q=0.7', US: 'en-US,en;q=0.9' }

/** Network error kind of a failed fetch (undici puts the system error into `cause`). */
const errorKind = (e: unknown): NonNullable<Fetched['error']> => {
  const err = e as { name?: string; cause?: { code?: string; message?: string } }
  const code = `${err.cause?.code ?? ''} ${err.cause?.message ?? ''}`
  if (err.name === 'TimeoutError') return 'timeout'
  if (/ENOTFOUND|EAI_AGAIN/.test(code)) return 'dns'
  if (/CERT|SSL|TLS|self.signed/i.test(code)) return 'tls'
  if (/ECONNREFUSED|ECONNRESET|EHOSTUNREACH/.test(code)) return 'refused'
  return 'other'
}

async function getPage(url: string, country: string): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': CRAWLER_UA, Accept: 'text/html,text/plain;q=0.9', 'Accept-Language': ACCEPT_LANGUAGE[country] ?? 'en,de;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !/text\/(html|plain)/.test(type)) return { url: res.url, status: res.status, html: '', type }
    const html = (await res.text()).slice(0, 2_000_000)
    return { url: res.url, status: res.status, html }
  } catch (e) {
    return { url, status: 0, html: '', error: errorKind(e) }
  }
}

interface Row {
  breweryId: string
  path: string
  name: string
  abv: number | null
}

const breweries: { id: string; name: string; website: string; country: string }[] = []
for (let from = 0; ; from += 1000) {
  const res = await fetch(`${API}/rest/v1/breweries?select=id,name,website,country&website=not.is.null&order=id&offset=${from}&limit=1000`, {
    headers: { apikey: KEY },
  })
  if (!res.ok) throw new Error(`breweries: ${res.status}`)
  const page = (await res.json()) as typeof breweries
  breweries.push(...page)
  if (page.length < 1000) break
}

// one visit per site, even if several breweries share it (the first one's country picks the language)
const sites = new Map<string, string[]>()
const countryOf = new Map<string, string>()
for (const b of breweries) {
  let origin: string
  try {
    origin = new URL(b.website).origin
  } catch {
    continue
  }
  sites.set(origin, [...(sites.get(origin) ?? []), b.id])
  if (!countryOf.has(origin)) countryOf.set(origin, b.country)
}
const langOf = (country: string): Lang => ((COUNTRY_TABLE as Record<string, { lang: string }>)[country]?.lang === 'en' ? 'en' : 'de')
const mine = [...sites].filter((_, i) => i % SHARDS === SHARD).slice(0, LIMIT)
console.log(`${breweries.length} breweries with website, ${sites.size} sites, shard ${SHARD}/${SHARDS}: ${mine.length}`)

const rows: Row[] = []
const diag: SiteRow[] = []
const stats = { sites: 0, unreachable: 0, robots: 0, withBeers: 0, pages: 0 }

async function crawl(origin: string, ids: string[]) {
  stats.sites++
  const country = countryOf.get(origin) ?? 'DE'
  const get = (url: string) => getPage(url, country)
  const robots = await get(`${origin}/robots.txt`)
  const robotsTxt = robots && robots.status === 200 ? robots.html : null
  const allowed = (u: string) => robotsAllows(robotsTxt, new URL(u).pathname)
  const note = (home: Fetched | null, beerPages: Fetched[], beers: number) =>
    diag.push({ origin, country, ...diagnoseSite(origin, { robotsAllowed: !!home, home, pages: beerPages, beers }) })
  if (!allowed(`${origin}/`)) {
    stats.robots++
    note(null, [], 0)
    return
  }
  await sleep(1000)
  const home = await get(`${origin}/`)
  if (!home.html) {
    stats.unreachable++
    note(home, [], 0)
    return
  }
  const pages = [home]
  const beerPages: Fetched[] = []
  for (const link of beerLinks(home.html, home.url).filter(allowed)) {
    await sleep(1000)
    const page = await get(link)
    beerPages.push(page)
    if (page.html) pages.push(page)
  }
  stats.pages += pages.length
  const found = new Map<string, Row>()
  for (const page of pages) {
    const path = new URL(page.url).pathname + new URL(page.url).search
    for (const beer of extractBeers(page.html, langOf(country)))
      for (const breweryId of ids) {
        const key = `${breweryId}|${beer.name.toLowerCase()}`
        const prev = found.get(key)
        if (!prev || (prev.abv == null && beer.abv != null)) found.set(key, { breweryId, path, ...beer })
      }
  }
  if (found.size) stats.withBeers++
  rows.push(...found.values())
  note(home, beerPages, found.size)
}

const queue = [...mine]
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    for (let next = queue.shift(); next; next = queue.shift())
      await crawl(...next).catch((e: unknown) => {
        stats.unreachable++
        if (!diag.some((d) => d.origin === next![0]))
          diag.push({ origin: next![0], country: countryOf.get(next![0]) ?? 'DE', ...diagnoseSite(next![0], { robotsAllowed: true, home: null, pages: [], beers: 0 }), error: 'other' })
        console.warn(`${next![0]}: ${e instanceof Error ? e.message : e}`)
      })
  }),
)

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, `web-${SHARD}.json`), JSON.stringify(rows, null, 1))
writeFileSync(join(OUT, `web-diag-${SHARD}.json`), JSON.stringify(diag, null, 1))
console.log(
  `sites ${stats.sites} · robots.txt says no ${stats.robots} · unreachable ${stats.unreachable} · pages ${stats.pages} · sites with beers ${stats.withBeers} · beers ${rows.length}`,
)
