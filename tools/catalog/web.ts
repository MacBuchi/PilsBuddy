// Brewery websites (R1b): robots.txt, links to the beer pages, beers on a page. Pure – crawl.ts does the I/O.
// Only facts are taken (name, ABV); the style comes from normalizeStyle like for every other source.
import { normalizeStyle } from '../../src/domain/styleProfile'

export const CRAWLER_UA = 'PilsBuddyBot/0.1 (+https://pilsbuddy.mcbuchi.de; macbuchi.apps@gmail.com)'

/**
 * robots.txt → is a path allowed for us? Uses the group for „pilsbuddybot“ if present, else „*“.
 * Conservative: any matching Disallow wins over Allow; `*` and `$` in rules are honoured.
 */
export function robotsAllows(robots: string | null, path: string): boolean {
  if (!robots) return true
  const groups: { agents: string[]; disallow: string[] }[] = []
  let cur: { agents: string[]; disallow: string[] } | null = null
  let lastWasAgent = false
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const [, key, value] = m
    const k = key.toLowerCase()
    if (k === 'user-agent') {
      if (!lastWasAgent || !cur) groups.push((cur = { agents: [], disallow: [] }))
      cur.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (cur && k === 'disallow' && value) cur.disallow.push(value)
  }
  const mine = groups.find((g) => g.agents.some((a) => a.includes('pilsbuddybot'))) ?? groups.find((g) => g.agents.includes('*'))
  if (!mine) return true
  return !mine.disallow.some((rule) => {
    const re = new RegExp('^' + rule.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$|\$$/, '$'))
    return re.test(path)
  })
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&auml;/g, 'ä')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/gi, ' ')

/** Visible text of an HTML fragment. */
export const textOf = (html: string) =>
  decode(html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const BEER_LINK = /(unsere[-_\s]?)?biere?\b|bierspezialit|sortiment|produkte|unsere[-_\s]?marken|beers?\b|bierwelt/i
const SKIP_LINK = /shop|warenkorb|cart|checkout|jobs?|karriere|impressum|datenschutz|privacy|agb|kontakt|login|\.(pdf|jpe?g|png|gif|zip)$/i

/** Same-site links that look like the beer overview, best first (max `limit`). */
export function beerLinks(html: string, base: string, limit = 3): string[] {
  const baseUrl = new URL(base)
  const scored = new Map<string, number>()
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url: URL
    try {
      url = new URL(decode(m[1]), baseUrl)
    } catch {
      continue
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, '') !== baseUrl.hostname.replace(/^www\./, '')) continue
    const text = textOf(m[2])
    let path = url.pathname
    try {
      path = decodeURIComponent(path)
    } catch {
      // malformed %-escape: match on the raw path
    }
    if (SKIP_LINK.test(path) || SKIP_LINK.test(text)) continue
    const score = (BEER_LINK.test(text) ? 2 : 0) + (BEER_LINK.test(path) ? 1 : 0)
    if (!score) continue
    url.hash = ''
    const key = url.toString()
    scored.set(key, Math.max(scored.get(key) ?? 0, score))
  }
  return [...scored].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, limit).map(([u]) => u)
}

export interface WebBeer {
  name: string
  abv: number | null
}

/** Not a beer name: navigation, headings of sections, calls to action. */
const NOT_A_NAME =
  /unsere|alle |mehr|weiter|entdecken|shop|kaufen|bestellen|warenkorb|karte|sortiment|übersicht|produkte|biere$|^biere?\b|spezialitäten|newsletter|cookie|kontakt|öffnungszeit|veranstaltung|news|aktuell|geschichte|tradition|führung|gutschein|^\d|€|schwarzwald|zwischen|willkommen|herzlich|heimat|region|[!?]$/i

/** Sentences, events, rooms and news rather than a beer: function words, years, typical nouns. */
const NOT_A_BEER =
  /\b(und|ist|nicht|der|die|das|den|dem|des|im|auf|für|von|vom|mit|aus|als|wie|zum|zur|bei|nach|ein|eine|einen|einem|the|and|of|for|with)\b|\b(19|20)\d\d\b|\p{L}+(ung|verkauf|hütten?|fest|feste|welt|abend|tour|markt|stube|garten|laden|vielfalt|keller)\b|vorgestellt|offiziell|ab sofort|gewinn|glas|gelee|alternativ|genießen|\d\s*l\b|[.,]$|,.*,/iu

const ABBREVIATIONS = new Set(['IPA', 'APA', 'IRA', 'DIPA', 'NEIPA', 'ESB'])

/** All-caps names get title case („INDIA PALE ALE“ → „India Pale Ale“); IPA and two-letter words stay. */
const unshout = (name: string) =>
  /\p{Ll}/u.test(name.replace(/ß/g, ''))
    ? name
    : name.replace(/\p{L}{3,}/gu, (w) => (ABBREVIATIONS.has(w) ? w : w[0] + w.slice(1).toLowerCase()))

/**
 * Tidies a heading into a beer name: drops soft hyphens and surrounding quotes, keeps the part before
 * a dash if that already names the style („„Dunkler Doppelbock“ – im Rumfass veredelt“).
 */
export function cleanName(raw: string): string {
  const strip = (s: string) => s.replace(/^[\s„“”"«»'‚‘’]+|[\s„“”"«»'‚‘’]+$/g, '').replace(/\s+/g, ' ')
  const name = strip(raw.replace(/[\u00ad\u200b]/g, ''))
  const head = strip(name.split(/\s[–—|-]\s/)[0])
  return unshout(head !== name && normalizeStyle([head]) ? head : name)
}

const ABV = /(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*(?:vol|alc|alk)/i

/**
 * Beers on a page: schema.org Product names (JSON-LD), and headings that name a beer style
 * („Hoepfner Pilsner“, „Hefeweizen hell“) with the ABV from the text up to the next heading.
 */
export function extractBeers(html: string): WebBeer[] {
  const out = new Map<string, WebBeer>()
  const add = (rawName: string, abv: number | null) => {
    const name = cleanName(rawName)
    if (name.length < 3 || name.length > 50 || name.split(' ').length > 6 || NOT_A_NAME.test(name) || NOT_A_BEER.test(name)) return
    if (!normalizeStyle([name])) return
    const key = name.toLowerCase()
    const prev = out.get(key)
    if (!prev || (prev.abv == null && abv != null)) out.set(key, { name, abv: abv != null && abv > 0 && abv <= 20 ? abv : null })
  }
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown
    try {
      data = JSON.parse(m[1])
    } catch {
      continue
    }
    const walk = (x: unknown): void => {
      if (Array.isArray(x)) return x.forEach(walk)
      if (!x || typeof x !== 'object') return
      const o = x as Record<string, unknown>
      const type = String(o['@type'] ?? '')
      if (/Product/i.test(type) && typeof o.name === 'string') {
        const abvMatch = textOf(String(o.description ?? '')).match(ABV)
        add(decode(o.name), abvMatch ? Number(abvMatch[1].replace(',', '.')) : null)
      }
      Object.values(o).forEach(walk)
    }
    walk(data)
  }
  const body = html.replace(/<(script|style|noscript|nav|header|footer)\b[\s\S]*?<\/\1>/gi, ' ')
  const heads = [...body.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
  heads.forEach((h, i) => {
    const after = body.slice(h.index! + h[0].length, heads[i + 1]?.index ?? body.length).slice(0, 2000)
    const abvMatch = textOf(after).match(ABV)
    add(textOf(h[2]), abvMatch ? Number(abvMatch[1].replace(',', '.')) : null)
  })
  return [...out.values()]
}
