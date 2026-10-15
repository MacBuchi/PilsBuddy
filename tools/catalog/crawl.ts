// Brewery websites → raw/web-<shard>.json (R1b). Runs on GitHub Actions (catalog-web.yml), not locally.
//   npx tsx tools/catalog/crawl.ts [--shard 0 --shards 1] [--limit 50] [--out tools/catalog/raw]
// Breweries come from the live catalogue (public API, published rows with a website), so every beer is
// already tied to its brewery; the brewery's country picks the language profile and Accept-Language. Polite: robots.txt, own User-Agent, ≤ 4 pages per site
// (plus ≤ 3 sitemap files when the home page links no beer page, V9, and ≤ 2 PDF drinks lists when the pages name no
// beer, V9c), 1 s between requests.
// V8: every site also gets a reason (diagnose.ts) in raw/web-diag-<shard>.json – why it gave beers or none.
/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import COUNTRY_TABLE from './countries.json'
import { diagnoseSite } from './diagnose'
import type { Fetched, SiteRow } from './diagnose'
import { pdfItems } from './pdf'
import { beerLinks, beerPdfLinks, CRAWLER_UA, extractBeers, extractPdfBeers, pdfBlocks, pickSitemaps, robotsAllows, sitemapBeerLinks, sitemapUrls } from './web'
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
      headers: { 'User-Agent': CRAWLER_UA, Accept: 'text/html,text/plain;q=0.9,application/xml;q=0.8', 'Accept-Language': ACCEPT_LANGUAGE[country] ?? 'en,de;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !/text\/(html|plain|xml)|application\/xml/.test(type)) return { url: res.url, status: res.status, html: '', type }
    const html = (await res.text()).slice(0, 2_000_000)
    return { url: res.url, status: res.status, html }
  } catch (e) {
    return { url, status: 0, html: '', error: errorKind(e) }
  }
}

/** A PDF drinks list (V9c) → its text pieces; null when it is no PDF, too big or unreadable. */
async function getPdf(url: string, country: string) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': CRAWLER_UA, Accept: 'application/pdf', 'Accept-Language': ACCEPT_LANGUAGE[country] ?? 'en,de;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok || !/pdf|octet-stream/.test(res.headers.get('content-type') ?? '') || Number(res.headers.get('content-length') ?? 0) > 8e6) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.length > 8e6) return null
    return await pdfItems(bytes)
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
const stats = { sites: 0, unreachable: 0, robots: 0, withBeers: 0, pages: 0, pdfs: 0, withPdfBeers: 0 }

async function crawl(origin: string, ids: string[]) {
  stats.sites++
  const country = countryOf.get(origin) ?? 'DE'
  const get = (url: string) => getPage(url, country)
  const robots = await get(`${origin}/robots.txt`)
  const robotsTxt = robots && robots.status === 200 ? robots.html : null
  const allowed = (u: string) => robotsAllows(robotsTxt, new URL(u).pathname)
  let links: string[] = []
  let fromSitemap = false
  let pdfBeers = 0
  const note = (home: Fetched | null, beerPages: Fetched[], beers: number) =>
    diag.push({
      origin,
      country,
      ...diagnoseSite(origin, { robotsAllowed: !!home, home, pages: beerPages, beers, links: links.length, sitemap: fromSitemap, pdfBeers }),
    })
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
  links = beerLinks(home.html, home.url).filter(allowed)
  if (!links.length) {
    links = (await sitemapLinks(origin, robotsTxt, get, allowed)).filter(allowed)
    fromSitemap = links.length > 0
  }
  for (const link of links) {
    await sleep(1000)
    const page = await get(link)
    beerPages.push(page)
    if (page.html) pages.push(page)
  }
  stats.pages += pages.length
  const found = new Map<string, Row>()
  const add = (url: string, beers: { name: string; abv: number | null }[]) => {
    const path = new URL(url).pathname + new URL(url).search
    for (const beer of beers)
      for (const breweryId of ids) {
        const key = `${breweryId}|${beer.name.toLowerCase()}`
        const prev = found.get(key)
        if (!prev || (prev.abv == null && beer.abv != null)) found.set(key, { breweryId, path, ...beer })
      }
  }
  for (const page of pages) add(page.url, extractBeers(page.html, langOf(country)))
  // V9c: no beer on the pages – the drinks list may be a PDF (own site: robots.txt applies; builder file hosts too)
  if (!found.size) {
    const pdfs = [...new Set(pages.flatMap((p) => beerPdfLinks(p.html, p.url)))]
      .filter((u) => new URL(u).origin !== origin || allowed(u))
      .slice(0, 2)
    for (const pdf of pdfs) {
      await sleep(1000)
      const items = await getPdf(pdf, country)
      if (!items) continue
      stats.pdfs++
      const beers = extractPdfBeers(pdfBlocks(items), langOf(country))
      pdfBeers += beers.length
      add(pdf, beers)
    }
    if (found.size) stats.withPdfBeers++
  }
  if (found.size) stats.withBeers++
  rows.push(...found.values())
  note(home, beerPages, found.size)
}

/** Beer pages from the sitemap (robots.txt „Sitemap:“, else /sitemap.xml) – at most one index and two child sitemaps. */
async function sitemapLinks(origin: string, robotsTxt: string | null, get: (url: string) => Promise<Fetched>, allowed: (u: string) => boolean) {
  const host = (u: string) => {
    try {
      return new URL(u).hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  }
  const own = (u: string) => host(u) === host(origin) && allowed(u)
  const declared = [...(robotsTxt ?? '').matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1])
  const first = declared.find(own) ?? `${origin}/sitemap.xml`
  if (!own(first)) return []
  await sleep(1000)
  const top = await get(first)
  if (!top.html) return []
  let { pages } = sitemapUrls(top.html)
  for (const child of pickSitemaps(sitemapUrls(top.html).sitemaps.filter(own))) {
    await sleep(1000)
    const sub = await get(child)
    if (sub.html) pages = [...pages, ...sitemapUrls(sub.html).pages]
  }
  return sitemapBeerLinks(pages, origin)
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
  `sites ${stats.sites} · robots.txt says no ${stats.robots} · unreachable ${stats.unreachable} · pages ${stats.pages} · PDFs ${stats.pdfs} · sites with beers ${stats.withBeers} (from PDF ${stats.withPdfBeers}) · beers ${rows.length}`,
)
