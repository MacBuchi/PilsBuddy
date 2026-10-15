// Brewery websites (R1b): robots.txt, links to the beer pages, beers on a page. Pure – crawl.ts does the I/O.
// Only facts are taken (name, ABV); the style comes from normalizeStyle like for every other source.
// Two language profiles for the filters (`de` for DACH, `en` for Canada/USA, countries.json): a German sentence
// filter would throw away „Son of a Peach“, an English one would keep German events.
import { normalizeStyle } from '../../src/domain/styleProfile'
import { notABeerName } from './merge'

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
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, ' ')

/** Visible text of an HTML fragment. */
export const textOf = (html: string) =>
  decode(html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const BEER_LINK =
  /(unsere[-_\s]?)?biere?\b|bierspezialit|sortiment|produkte|unsere[-_\s]?marken|beers?\b|bierwelt|on[-_\s]?tap|tap[-_\s]?list|line[-_\s]?up|brews\b|bi[eè]res\b/i
/** Drinks pages and tap lists – the beers are often there (V9); they count less than a link that says beer. */
const DRINK_LINK = /\bdrinks?\b|getr[äa]nke|\bdraft|\bdraught|\btaps?\b|\bmenus?\b|ausschank|durst|pouring/i
const SKIP_LINK =
  /food|speise|fr[üu]hst[üu]ck|breakfast|brunch|lunch|dinner|catering|kids|\bwines?\b|cocktail|spirits|shop|store|merch|warenkorb|cart|checkout|jobs?|careers?|karriere|impressum|datenschutz|privacy|agb|kontakt|login|tickets?|gift[-_\s]?cards?|archiv|retired|of[-_\s]the[-_\s]past|past[-_\s]beers|\.(pdf|jpe?g|png|gif|zip)$/i

/** How much a link looks like the beer overview: beer words in text 8 / path 4, drinks words in text 2 / path 1. */
const linkScore = (path: string, text: string) =>
  (BEER_LINK.test(text) ? 8 : 0) + (BEER_LINK.test(path) ? 4 : 0) + (DRINK_LINK.test(text) ? 2 : 0) + (DRINK_LINK.test(path) ? 1 : 0)

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
    const score = linkScore(path, text)
    if (!score) continue
    url.hash = ''
    const key = url.toString()
    scored.set(key, Math.max(scored.get(key) ?? 0, score))
  }
  return [...scored].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, limit).map(([u]) => u)
}

/** A sitemap: its page URLs, or – for a sitemap index – the sitemaps it lists. */
export function sitemapUrls(xml: string): { pages: string[]; sitemaps: string[] } {
  const locs = (tag: string) =>
    [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<loc>\\s*(?:<!\\[CDATA\\[)?([^<\\]]+?)(?:\\]\\]>)?\\s*<\\/loc>`, 'gi'))].map((m) => decode(m[1]))
  return { pages: locs('url'), sitemaps: locs('sitemap') }
}

/** Child sitemaps of an index worth reading: pages, products and beers before posts, tags and authors (max `limit`). */
export function pickSitemaps(urls: string[], limit = 2): string[] {
  const rank = (u: string) => (/beer|bier|product|produkt|page/i.test(u) ? 0 : /post|tag|author|categor|attachment|image|video/i.test(u) ? 2 : 1)
  return [...urls].sort((a, b) => rank(a) - rank(b) || a.length - b.length).slice(0, limit)
}

/**
 * Sitemap pages that look like the beer overview – when the home page links none (V9): same site, path words only,
 * overview pages („/beers/“) before single beers („/beer/sculpin/“).
 */
export function sitemapBeerLinks(urls: string[], base: string, limit = 3): string[] {
  const host = new URL(base).hostname.replace(/^www\./, '')
  const scored: [string, number, number][] = []
  for (const u of new Set(urls)) {
    let url: URL
    try {
      url = new URL(u)
    } catch {
      continue
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, '') !== host) continue
    let path = url.pathname
    try {
      path = decodeURIComponent(path)
    } catch {
      // keep the raw path
    }
    if (SKIP_LINK.test(path)) continue
    const score = linkScore(path, '')
    if (score) scored.push([url.toString(), score, path.split('/').filter(Boolean).length])
  }
  return scored.sort((a, b) => b[1] - a[1] || a[2] - b[2] || a[0].length - b[0].length).slice(0, limit).map(([u]) => u)
}

export interface WebBeer {
  name: string
  abv: number | null
}

/** Language profile of a brewery website – the brewery country's `lang` in countries.json. */
export type Lang = 'de' | 'en'

/** Not a beer name: navigation, headings of sections, calls to action. */
const NOT_A_NAME =
  /unsere|alle |mehr|weiter|entdecken|shop|kaufen|bestellen|warenkorb|karte|sortiment|übersicht|produkte|biere$|^biere?\b|spezialitäten|newsletter|cookie|kontakt|öffnungszeit|veranstaltung|news|aktuell|geschichte|tradition|führung|gutschein|^\d|€|schwarzwald|zwischen|willkommen|herzlich|heimat|region|[!?]$/i

/**
 * English navigation and calls to action. A leading number is fine here („90 Minute IPA“, „805“) – prices, sizes
 * and years are caught by NOT_A_BEER_EN.
 */
const NOT_A_NAME_EN =
  /\b(see all|view all|our|more|shop|buy|order|find|view|see|learn|discover|explore|menu|tap ?list|on tap|now pouring|merch|gift|subscribe|sign up|contact|hours|events?|news|visit|about|welcome|story|history|careers?|jobs?)\b|^beers?$|\$|€|[!?]$/i

/** English sentences, other drinks, food, merch, events and pack sizes rather than a beer. */
const NOT_A_BEER_EN =
  /\b(is|are|was|were|we|you|your|join|come|try|get|today|tonight|tomorrow)\b|\b(19|20)\d\d\b|\b(hard )?(seltzers?|ciders?|kombucha|sodas?|vodka|gin|whiske?y|spirits|mead|cocktails?|food|kitchen|salads?|burgers?|pizzas?|wings|fries|sandwich(es)?|tacos?|nachos|pretzels?|malts?$|trivia|music|festival|release party|ginger ale|root beer(?! (porter|stout|ale))|(new )?releases?|series|trends|takeover|(mon|tues|wednes|thurs|fri|satur|sun)days?|tours?|tickets?|reservations?|club|membership|patio|locations?|blog|recipes?|pairings?|awards?|medals?|winners?|growlers?|crowlers?|kegs?|glass(ware)?|t-?shirts?|hats?|hoodies?)\b|\b(?<!barley[\s-])wines?\b|\d+\s*(x|pack|pk|-pack)\b|\d+\s*(oz|ml|l)\b|\bales? & lagers?\b|\bparty$|[.,]$|,.*,/iu

/** Sentences, events, rooms and news rather than a beer: function words, years, typical nouns. */
const NOT_A_BEER =
  /\b(und|ist|nicht|der|die|das|den|dem|des|im|auf|für|von|vom|mit|aus|als|wie|zum|zur|bei|nach|ein|eine|einen|einem|in|an|us|em|oder|or|the|and|of|for|with)\b|\b(19|20)\d\d\b|\p{L}+(ung|verkauf|hütten?|fest|feste|welt|abend|tour|markt|stube|garten|laden|vielfalt|keller)\b|vorgestellt|offiziell|ab sofort|gewinn|mitarbeiter|\(m\/w|\(w\/m|\p{L}*(brand|geist|likör|schnaps)\b|schnitzel|braten|generator|siphon|paradies|\bschweiz\b|\d+\s*x\s*\d+|\d\s*cl\b|events?\b|steckbrief|gastronomie|\p{L}+land\b|glas|gelee|alternativ|genießen|\d\s*l\b|[.,]$|,.*,/iu

const ABBREVIATIONS = new Set(['IPA', 'APA', 'IRA', 'DIPA', 'NEIPA', 'ESB', 'IPL', 'XPA', 'DDH'])

/**
 * All-caps names get title case („INDIA PALE ALE“ → „India Pale Ale“), all-lowercase ones capitals
 * („renegade ipa“ → „Renegade IPA“); IPA and two-letter words stay as they are.
 */
const unshout = (name: string) => {
  const letters = name.replace(/ß/g, '')
  if (/\p{Ll}/u.test(letters) && /\p{Lu}/u.test(letters)) return name
  return name
    .replace(/\p{L}{3,}/gu, (w) =>
      ABBREVIATIONS.has(w.toUpperCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase(),
    )
    .replace(/(\p{L}['’])S\b/gu, '$1s') // „DEVIL’S“ → „Devil’s“, not „Devil’S“
}

/**
 * Brackets: „(Hoppy Lager )“ loses them, „Night Hike Porter (Porter)“ or „River Runner ESB (Extra Special
 * Bitter)“ the bracket if the rest still names a style, „Cackler IPA ( IPA“ everything from an unclosed one.
 */
const unbracket = (name: string) => {
  const inner = name.match(/^\(([^()]*)\)$/)
  if (inner) return inner[1].trim()
  const rest = name.replace(/\s*\([^()]*\)/g, '').trim()
  if (rest !== name && normalizeStyle([rest])) name = rest
  const open = name.replace(/\s*\([^)]*$/, '').trim()
  return normalizeStyle([open]) ? open : name.replace(/\s*\(\s*/, ' ').trim()
}

/**
 * Tidies a heading into a beer name: decodes entities, drops soft hyphens, surrounding quotes, labels
 * like „Jetzt neu:“ and „(SOLD OUT)“, keeps the part before
 * a dash if that already names the style („„Dunkler Doppelbock“ – im Rumfass veredelt“).
 */
export function cleanName(raw: string): string {
  const strip = (s: string) => s.replace(/^[\s„“”"«»'‚‘’]+|[\s„“”"«»'‚‘’]+$/g, '').replace(/\s+/g, ' ')
  let name = strip(
    decode(raw)
      .replace(/[\u00ad\u200b]/g, '')
      .replace(ABV_BEFORE_NAME, '')
      .replace(ABV_IN_NAME, '')
      .replace(/\s+\d{1,2}(?:[.,]\d{1,2})?\s*abv\b.*$/i, '') // „Porter 4.6 ABV • 28 IBU“
      .replace(/\s*\((sold out|ausverkauft|neu|new|limit|saison)[^)]*\)/gi, ''),
  )
  // „Jetzt neu: Distel Helles“ – a short label before a colon goes if it names no style
  const label = name.match(/^([^:]{1,20}):\s+(.+)$/)
  if (label && !normalizeStyle([label[1]])) name = strip(label[2])
  // separators left over from menus: „Hazy West Coast IPA |“, „Lucky Cat Rice Lager //“
  name = unbracket(name.replace(/([\s,]+(abv|ibu))?[\s|/\\•·│+~–—:-]*$/i, '').replace(/^[\s|/\\•·│~–—:-]+/, ''))
  // „Non-Alcoholic Beer Non-Alcoholic Beer“ – a name repeated by a tile's two labels
  const twice = name.match(/^(.{3,}) \1$/i)
  if (twice) name = twice[1]
  const head = strip(name.split(/\s[–—|•-]\s|\s*[•·│]\s*/)[0])
  return unshout(head !== name && normalizeStyle([head]) ? head : name)
}

/** „4,9 % vol“, „5.2% Alc.“, „6.5% ABV“ or „ABV: 6.5%“ */
const ABV = /(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*(?:vol|alc|alk|abv)|\babv\b\s*[:\-–]?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i
const abvIn = (t: string) => {
  const m = t.match(ABV)
  const v = m?.[1] ?? m?.[2]
  return v ? Number(v.replace(',', '.')) : null
}

/** „West Coast IPA 6.4% ABV“: the ABV at the end of a name is cut off (and used if the text had none). */
const ABV_IN_NAME = /[\s,(–•·│|-]+(\d{1,2}(?:[.,]\d{1,2})?)\s*%.*$/

/** „5.5% ABV - NE-Style IPA“: the ABV in front of the name. */
const ABV_BEFORE_NAME = /^\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*(?:abv|vol\.?|alc\.?)?\s*[-–—|•·│:]\s*/i

const toAbv = (s: string | undefined) => {
  const v = s == null ? NaN : Number(s.replace(',', '.'))
  return v > 0 && v <= 20 ? v : null
}

/** A heading or product title as a beer (tidied name + ABV from the name), or null if it is no beer. */
export function beerName(raw: string, abv: number | null = null, lang: string = 'de'): WebBeer | null {
  const name = cleanName(raw)
  const [notName, notBeer] = lang === 'en' ? [NOT_A_NAME_EN, NOT_A_BEER_EN] : [NOT_A_NAME, NOT_A_BEER]
  if (name.length < 3 || name.length > 50 || name.split(' ').length > 6 || notName.test(name) || notBeer.test(name) || notABeerName(name)) return null
  if (!normalizeStyle([name])) return null
  return { name, abv: toAbv(abv?.toString()) ?? toAbv(raw.match(ABV_IN_NAME)?.[1]) ?? toAbv(raw.match(ABV_BEFORE_NAME)?.[1]) }
}

/**
 * Beers on a page: schema.org Product names (JSON-LD), and headings that name a beer style
 * („Hoepfner Pilsner“, „Hefeweizen hell“) with the ABV from the text up to the next heading.
 */
export function extractBeers(html: string, lang: Lang = 'de'): WebBeer[] {
  const out = new Map<string, WebBeer>()
  const add = (rawName: string, abv: number | null) => {
    const beer = beerName(rawName, abv, lang)
    if (!beer) return
    const key = beer.name.toLowerCase()
    const prev = out.get(key)
    if (!prev || (prev.abv == null && beer.abv != null)) out.set(key, beer)
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
        add(decode(o.name), abvIn(textOf(String(o.description ?? ''))))
      }
      Object.values(o).forEach(walk)
    }
    walk(data)
  }
  const body = html.replace(/<(script|style|noscript|nav|header|footer)\b[\s\S]*?<\/\1>/gi, ' ')
  const heads = [...body.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
  heads.forEach((h, i) => {
    const after = body.slice(h.index! + h[0].length, heads[i + 1]?.index ?? body.length).slice(0, 2000)
    add(textOf(h[2]), abvIn(textOf(after)))
  })
  // V9: product tiles, lists, table cells, h5/h6 – a block whose whole text is a beer name. Counts only as a list
  // (≥ 2 beers), so a single style word somewhere on the page does not become a beer.
  const loose = extractBlocks(body, lang)
  if (loose.length >= 2) loose.forEach((b) => add(b.name, b.abv))
  return [...out.values()]
}

/** Block-level tags: their text is one piece – „<li><a>Hazy <b>IPA</b></a></li>“ is „Hazy IPA“. */
const BLOCK = /<\/?(?:div|p|li|ul|ol|dl|dt|dd|h[1-6]|td|th|tr|table|section|article|aside|main|figure|figcaption|blockquote|br|hr)\b[^>]*>/i

/** Words of style lines („Hazy IPA“, „German-Style Pilsner“, „Barrel-Aged Imperial Stout“) – no beer's own name. */
const STYLE_WORD =
  /^(ipa|dipa|tipa|neipa|apa|esb|ale|ales|lager|pils|pilsner|pilsener|stout|porter|sour|gose|saison|tripel|dubbel|quad|witbier|wit|wheat|weizen|hefeweizen|weissbier|weißbier|kölsch|kolsch|märzen|marzen|oktoberfest|festbier|helles|hell|dunkel|dunkles|bock|doppelbock|maibock|eisbock|schwarzbier|kellerbier|keller|zwickel|export|rauchbier|altbier|alt|radler|barleywine|barley|wine|hazy|juicy|double|triple|imperial|session|west|east|coast|new|england|india|pale|light|cream|blonde|blond|amber|red|brown|golden|dark|black|white|american|german|belgian|czech|mexican|vienna|munich|english|irish|scotch|scottish|baltic|russian|oatmeal|milk|pastry|fruited|sweet|dry|hopped|hoppy|dry-hopped|barrel|aged|barrel-aged|nitro|style|non-alcoholic|alkoholfrei|alkoholfreies|naturtrüb|unfiltered|fresh|hop|farmhouse|wild|kettle|berliner|weisse|lambic|kriek|cider|beer|bier|traditional|classic|premium|original|spezial|extra|special|bitter|strong|mild|smoked|rye|and|&|\/|-)$/i

/** „Hazy IPA“, „Imperial Stout“: a line that only names a style – on product tiles the subtitle under the name. */
export const styleOnly = (name: string) => name.split(/[\s-]+/).filter((w) => !/^[\d.,%]*$/.test(w)).every((w) => STYLE_WORD.test(w))

/** Blocks whose whole text names a beer, with the ABV from the blocks up to the next beer. */
function extractBlocks(body: string, lang: Lang): WebBeer[] {
  const blocks = body.split(BLOCK).map(textOf).filter(Boolean)
  const notName = lang === 'en' ? NOT_A_NAME_EN : NOT_A_NAME
  const found: { at: number; beer: WebBeer }[] = []
  blocks.forEach((t, at) => {
    const beer = t.length <= 80 ? beerName(t, null, lang) : null
    if (!beer) return
    // „Fidelis“ / „Hazy IPA“ or „Super Simcoe IPA“ / „West Coast IPA“: a style line right under a short fancy name, or
    // under a named beer of the same style, is that beer's style („Pils“ / „Helles“, „Kellerpils“ / „Hefeweizen“ stay)
    const prev = blocks[at - 1]
    const prevBeer = prev ? beerName(prev, null, lang) : null
    const subtitle = prevBeer
      ? !styleOnly(prevBeer.name) && normalizeStyle([prevBeer.name]) === normalizeStyle([beer.name])
      : !!prev && prev.length <= 40 && !/\d/.test(prev) && !notName.test(prev)
    if (styleOnly(beer.name) && subtitle) return
    found.push({ at, beer })
  })
  const seen = new Set<string>()
  return found.flatMap(({ at, beer }, i) => {
    const key = beer.name.toLowerCase()
    if (seen.has(key)) return []
    seen.add(key)
    const after = blocks.slice(at + 1, found[i + 1]?.at ?? blocks.length).join(' ').slice(0, 500)
    return [{ name: beer.name, abv: beer.abv ?? abvIn(after) }]
  })
}
