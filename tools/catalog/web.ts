// Brewery websites (R1b): robots.txt, links to the beer pages, beers on a page. Pure – crawl.ts does the I/O.
// Only facts are taken (name, ABV); the style comes from normalizeStyle like for every other source.
// Two language profiles for the filters (`de` for DACH, `en` for Canada/USA, countries.json): a German sentence
// filter would throw away „Son of a Peach“, an English one would keep German events.
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
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, ' ')

/** Visible text of an HTML fragment. */
export const textOf = (html: string) =>
  decode(html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const BEER_LINK =
  /(unsere[-_\s]?)?biere?\b|bierspezialit|sortiment|produkte|unsere[-_\s]?marken|beers?\b|bierwelt|on[-_\s]?tap|tap[-_\s]?list|line[-_\s]?up|brews\b|bi[eè]res\b/i
const SKIP_LINK =
  /shop|store|merch|warenkorb|cart|checkout|jobs?|careers?|karriere|impressum|datenschutz|privacy|agb|kontakt|login|tickets?|gift[-_\s]?cards?|\.(pdf|jpe?g|png|gif|zip)$/i

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
  /\b(is|are|was|were|we|you|your|join|come|try|get|today|tonight|tomorrow)\b|\b(19|20)\d\d\b|\b(hard )?(seltzers?|ciders?|kombucha|sodas?|vodka|gin|whiske?y|spirits|mead|cocktails?|food|kitchen|trivia|music|festival|release party|ginger ale|root beer(?! (porter|stout|ale))|(new )?releases?|series|trends|takeover|(mon|tues|wednes|thurs|fri|satur|sun)days?|tours?|tickets?|reservations?|club|membership|patio|locations?|blog|recipes?|pairings?|awards?|medals?|winners?|growlers?|crowlers?|kegs?|glass(ware)?|t-?shirts?|hats?|hoodies?)\b|\b(?<!barley[\s-])wines?\b|\d+\s*(x|pack|pk|-pack)\b|\d+\s*(oz|ml|l)\b|\bales? & lagers?\b|\bparty$|[.,]$|,.*,/iu

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
      .replace(ABV_IN_NAME, '')
      .replace(/\s+\d{1,2}(?:[.,]\d{1,2})?\s*abv\b.*$/i, '') // „Porter 4.6 ABV • 28 IBU“
      .replace(/\s*\((sold out|ausverkauft|neu|new|limit|saison)[^)]*\)/gi, ''),
  )
  // „Jetzt neu: Distel Helles“ – a short label before a colon goes if it names no style
  const label = name.match(/^([^:]{1,20}):\s+(.+)$/)
  if (label && !normalizeStyle([label[1]])) name = strip(label[2])
  // separators left over from menus: „Hazy West Coast IPA |“, „Lucky Cat Rice Lager //“
  name = unbracket(name.replace(/([\s,]+(abv|ibu))?[\s|/\\•~–—:-]*$/i, '').replace(/^[\s|/\\•~–—:-]+/, ''))
  const head = strip(name.split(/\s[–—|•-]\s/)[0])
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
const ABV_IN_NAME = /[\s,(–-]+(\d{1,2}(?:[.,]\d{1,2})?)\s*%.*$/

const toAbv = (s: string | undefined) => {
  const v = s == null ? NaN : Number(s.replace(',', '.'))
  return v > 0 && v <= 20 ? v : null
}

/** A heading or product title as a beer (tidied name + ABV from the name), or null if it is no beer. */
export function beerName(raw: string, abv: number | null = null, lang: string = 'de'): WebBeer | null {
  const name = cleanName(raw)
  const [notName, notBeer] = lang === 'en' ? [NOT_A_NAME_EN, NOT_A_BEER_EN] : [NOT_A_NAME, NOT_A_BEER]
  if (name.length < 3 || name.length > 50 || name.split(' ').length > 6 || notName.test(name) || notBeer.test(name)) return null
  if (!normalizeStyle([name])) return null
  return { name, abv: toAbv(abv?.toString()) ?? toAbv(raw.match(ABV_IN_NAME)?.[1]) }
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
  return [...out.values()]
}
