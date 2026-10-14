// V8: why a brewery website gives no beers. Pure – crawl.ts collects the pages, this file names the reason, and
// diag-report.ts adds the sites up. Only for finding the next crawler work (V9); nothing here changes the catalogue.
import { normalizeStyle } from '../../src/domain/styleProfile'
import { beerLinks, textOf } from './web'

/** What a page fetch ended with: a page, an HTTP status without usable HTML, or a network error. */
export interface Fetched {
  url: string
  status: number
  html: string
  /** network error kind when there was no response at all */
  error?: 'timeout' | 'dns' | 'tls' | 'refused' | 'other'
  /** response type when it was no HTML */
  type?: string
}

/**
 * One reason per site, most specific first:
 * robots – robots.txt forbids us · offline – no response (DNS, TLS, timeout) · blocked – 401/403/429/503 (bot shield)
 * · http-error – another status · not-html · offsite – the website is Facebook, Instagram, Linktree, Untappd …
 * · beers – found beers · widget – menu embedded from Untappd/Taplist/BeerMenus/… · js – page built by JavaScript
 * · pdf – the beer list is a PDF · no-beer-page – no link that looks like the beers, home page has no beer names
 * · unnamed – a beer page loaded, but no text on it names a style (fancy names only, or beers as images)
 * · missed – beer names are on the pages, but the extractor took none (too strict, or not in h1–h4).
 */
export type Reason =
  | 'robots'
  | 'offline'
  | 'blocked'
  | 'http-error'
  | 'not-html'
  | 'offsite'
  | 'beers'
  | 'widget'
  | 'js'
  | 'pdf'
  | 'no-beer-page'
  | 'unnamed'
  | 'missed'

export const REASONS: Reason[] = ['beers', 'robots', 'offline', 'blocked', 'http-error', 'not-html', 'offsite', 'widget', 'js', 'pdf', 'no-beer-page', 'unnamed', 'missed']

/** Site builders – tells V9 which kinds of pages are worth a dedicated reader. */
const BUILDERS: [string, RegExp][] = [
  ['wix', /static\.wixstatic\.com|wix-warmup-data|_wixCssImports|X-Wix/i],
  ['squarespace', /static1\.squarespace\.com|Squarespace\.Constants|squarespace-cdn/i],
  ['shopify', /cdn\.shopify\.com|Shopify\.theme/i],
  ['webflow', /webflow\.(js|com)|data-wf-page/i],
  ['jimdo', /jimdo(cdn)?\.com|jimdo-/i],
  ['godaddy', /img1\.wsimg\.com|godaddy/i],
  ['weebly', /weebly\.com|editmysite\.com/i],
  ['wordpress', /wp-content\/|wp-includes\//i],
  ['next', /__NEXT_DATA__|\/_next\/static/i],
  ['react', /<div id="(root|app)">\s*<\/div>/i],
]

/** Embedded tap lists – the beers live on another service, often loaded by script. */
const WIDGETS: [string, RegExp][] = [
  ['untappd', /untappd\.com\/(embed|menu|business)|business\.untappd|embed-menu-preloader|utfb/i],
  ['taplist', /taplist\.io/i],
  ['beermenus', /beermenus\.com/i],
  ['digitalpour', /digitalpour\.com/i],
  ['brewery-db', /ekos|orchestratedbeer|ob-menu/i],
]

/** Websites that are no brewery website. */
const OFFSITE = /(^|\.)(facebook|fb|instagram|linktr|untappd|yelp|google|tripadvisor|twitter|x|tiktok|beeradvocate|ratebeer)\.(com|ee|me|de)$/i

const BEER_PDF = /bier|beer|getr[äa]nke|karte|menu|drinks?|tap|sortiment|speise/i

export interface Signals {
  builder: string | null
  widget: string | null
  /** visible characters on the page (scripts, styles removed) */
  text: number
  /** looks rendered by JavaScript: little visible text for a lot of script, or an empty app root */
  js: boolean
  /** a linked PDF that looks like a beer or drinks list */
  pdf: boolean
  /** schema.org Product data present */
  jsonLd: boolean
  /** text pieces (any tag) that name a beer style – what an extractor could still find */
  styleNames: number
}

/** Signals of one page. */
export function pageSignals(html: string, base: string): Signals {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].reduce((n, m) => n + m[0].length, 0)
  const text = textOf(html).length
  const pdf = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+\.pdf)(?:\?[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi)].some(
    (m) => BEER_PDF.test(m[1]) || BEER_PDF.test(textOf(m[2])),
  )
  return {
    builder: BUILDERS.find(([, re]) => re.test(html))?.[0] ?? null,
    widget: WIDGETS.find(([, re]) => re.test(html))?.[0] ?? null,
    text,
    js: text < 400 && (scripts > 20 * Math.max(text, 1) || /<div id="(root|app|__next)">\s*<\/div>/i.test(html)),
    pdf: pdf || beerLinks(html, base, 10).some((u) => /\.pdf$/i.test(u)),
    jsonLd: /<script[^>]*application\/ld\+json[^>]*>[\s\S]*?"@type"\s*:\s*"Product"/i.test(html),
    styleNames: styleNames(html),
  }
}

/** Short text pieces of any element that name a beer style („Kellerbier“, „Hazy IPA“) – a ceiling for extraction. */
export function styleNames(html: string): number {
  const body = html.replace(/<(script|style|noscript|nav|header|footer)\b[\s\S]*?<\/\1>/gi, ' ')
  const seen = new Set<string>()
  for (const piece of body.split(/<[^>]+>/)) {
    const t = textOf(piece)
    if (t.length < 3 || t.length > 50 || t.split(' ').length > 6) continue
    if (normalizeStyle([t])) seen.add(t.toLowerCase())
  }
  return seen.size
}

export interface SiteInput {
  robotsAllowed: boolean
  /** the home page fetch (null when robots.txt forbids it) */
  home: Fetched | null
  /** the beer pages fetched after the home page */
  pages: Fetched[]
  /** beers found on all pages */
  beers: number
}

export interface Diagnosis {
  reason: Reason
  status: number
  error: string | null
  finalHost: string | null
  builder: string | null
  widget: string | null
  /** beer pages found and loaded besides the home page */
  beerPages: number
  styleNames: number
  jsonLd: boolean
}

/** The reason a site gave (or did not give) beers. */
export function diagnoseSite(origin: string, site: SiteInput): Diagnosis {
  const home = site.home
  const loaded = [home, ...site.pages].filter((p): p is Fetched => !!p?.html)
  const signals = loaded.map((p) => pageSignals(p.html, p.url))
  const any = <K extends keyof Signals>(k: K) => signals.find((s) => s[k])?.[k] ?? null
  let finalHost: string | null = null
  try {
    finalHost = home?.url ? new URL(home.url).hostname : null
  } catch {
    // keep null
  }
  const d: Diagnosis = {
    reason: 'missed',
    status: home?.status ?? 0,
    error: home?.error ?? null,
    finalHost: finalHost && finalHost.replace(/^www\./, '') !== new URL(origin).hostname.replace(/^www\./, '') ? finalHost : null,
    builder: any('builder'),
    widget: any('widget'),
    beerPages: site.pages.filter((p) => p.html).length,
    styleNames: Math.max(0, ...signals.map((s) => s.styleNames)),
    jsonLd: !!any('jsonLd'),
  }
  const host = finalHost ?? new URL(origin).hostname
  if (!site.robotsAllowed) d.reason = 'robots'
  else if (OFFSITE.test(host.replace(/^www\./, '')) || OFFSITE.test(new URL(origin).hostname.replace(/^www\./, ''))) d.reason = 'offsite'
  else if (!home || (!home.html && home.status === 0)) d.reason = 'offline'
  else if (!home.html && [401, 403, 429, 503].includes(home.status)) d.reason = 'blocked'
  else if (!home.html && home.status >= 400) d.reason = 'http-error'
  else if (!home.html) d.reason = 'not-html'
  else if (site.beers > 0) d.reason = 'beers'
  else if (d.widget) d.reason = 'widget'
  else if (signals.some((s) => s.js)) d.reason = 'js'
  else if (signals.some((s) => s.pdf)) d.reason = 'pdf'
  else if (d.beerPages === 0 && d.styleNames === 0) d.reason = 'no-beer-page'
  else if (d.styleNames === 0) d.reason = 'unnamed'
  return d
}

export interface SiteRow extends Diagnosis {
  origin: string
  country: string
}

/** Markdown report over all sites: reasons per country, builders and signals of the sites without beers. */
export function diagnosisReport(rows: SiteRow[], examples = 8): string {
  const countries = [...new Set(rows.map((r) => r.country))].sort()
  const count = (f: (r: SiteRow) => boolean, list = rows) => list.filter(f).length
  const pct = (n: number, of: number) => (of ? `${Math.round((100 * n) / of)} %` : '–')
  const out: string[] = []
  out.push(`## Crawler-Diagnose (V8)`, '', `${rows.length} Websites · mit Bieren ${count((r) => r.reason === 'beers')} (${pct(count((r) => r.reason === 'beers'), rows.length)})`, '')
  out.push(`| Grund | ${countries.join(' | ')} | gesamt | Anteil |`, `| --- | ${countries.map(() => '---:').join(' | ')} | ---: | ---: |`)
  for (const reason of REASONS) {
    const n = count((r) => r.reason === reason)
    if (!n) continue
    out.push(`| ${reason} | ${countries.map((c) => count((r) => r.reason === reason && r.country === c)).join(' | ')} | ${n} | ${pct(n, rows.length)} |`)
  }
  const without = rows.filter((r) => r.reason !== 'beers' && r.reason !== 'robots')
  const tally = (f: (r: SiteRow) => string | null, list: SiteRow[]) => {
    const m = new Map<string, number>()
    for (const r of list) {
      const k = f(r)
      if (k) m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ') || '–'
  }
  const reached = without.filter((r) => !['offline', 'blocked', 'http-error', 'not-html', 'offsite'].includes(r.reason))
  out.push('', `**Erreichbar, aber ohne Bier: ${reached.length}**`, '')
  out.push(`- Baukasten: ${tally((r) => r.builder ?? 'unbekannt', reached)}`)
  out.push(`- mit Bierseite geladen: ${count((r) => r.beerPages > 0, reached)} · ohne: ${count((r) => r.beerPages === 0, reached)}`)
  out.push(`- Stilnamen auf der Seite (≥ 1 / ≥ 5): ${count((r) => r.styleNames >= 1, reached)} / ${count((r) => r.styleNames >= 5, reached)}`)
  out.push(`- schema.org-Produktdaten: ${count((r) => r.jsonLd, reached)}`)
  out.push(`- Widgets: ${tally((r) => r.widget, reached)}`)
  const offline = without.filter((r) => r.reason === 'offline')
  out.push('', `**Nicht erreichbar:** ${tally((r) => r.error ?? 'ohne Antwort', offline)} · Status blocked/http-error: ${tally((r) => (['blocked', 'http-error'].includes(r.reason) ? String(r.status) : null), without)}`)
  out.push(`**Weitergeleitet auf andere Domain:** ${count((r) => !!r.finalHost)} (${tally((r) => r.finalHost?.replace(/^www\./, '').split('.').slice(-2).join('.') ?? null, rows.filter((r) => r.finalHost)).split(' · ').slice(0, 8).join(' · ')})`)
  out.push('', '### Beispiele', '')
  for (const reason of REASONS.filter((r) => r !== 'beers')) {
    const list = rows.filter((r) => r.reason === reason).slice(0, examples)
    if (list.length) out.push(`- **${reason}**: ${list.map((r) => r.origin.replace(/^https?:\/\//, '')).join(' · ')}`)
  }
  return out.join('\n') + '\n'
}
