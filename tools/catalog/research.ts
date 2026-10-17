// V12: researched beers – agents looked up breweries the crawler and the open databases had no beer for
// (tools/catalog/research/*.json, every beer and every hidden brewery with the page that shows it).
import { normName } from './merge'
import type { WebRow } from './merge'
import { cleanName, guestBeer } from './web'

/**
 * duplicate (V15): another catalogue entry is the same brewery and has its beers – note names its id;
 * not-a-brewery (V17): a monument, company seat or wrong Wikidata match – no brewery at all
 */
export type ResearchStatus = 'beers' | 'no-own-beer' | 'closed' | 'duplicate' | 'not-a-brewery' | 'unclear'
/** statuses that hide the brewery (with the page that shows it) */
export const HIDING: readonly ResearchStatus[] = ['closed', 'no-own-beer', 'duplicate', 'not-a-brewery']
export interface ResearchBeer {
  name: string
  style: string | null
  abv: number | null
  url: string
}
export interface ResearchEntry {
  id: string
  name: string
  status: ResearchStatus
  evidence: string | null
  note?: string
  /** date of the research, and which pass (model) found it */
  checked?: string
  stage?: string
  beers: ResearchBeer[]
  /** V17: beers an open database wrongly gives this brewery, each with the page of the brewery that makes it */
  wrong?: { name: string; url: string }[]
}
/** a beer named on another site than the brewery's own (beer_sources 6) */
export interface ResearchRow {
  breweryId: string
  name: string
  style: string | null
  abv: number | null
  url: string
}

const host = (url: string | null | undefined) => {
  try {
    return url ? new URL(url).hostname.toLowerCase().replace(/^www\./, '') : null
  } catch {
    return null
  }
}
/** researched beers per brewery – the agents list the permanent ones first (user wish 2026-10-16: max 3) */
export const MAX_RESEARCHED_BEERS = 3

const link = (url: string) => /^https?:\/\/[^\s]+$/.test(url) && url.length <= 300 && host(url) != null
// a link to another site is stored as it is (regional_beers.source_ref, ≤ 300) and opened in the app – https only
const https = (url: string) => link(url) && url.startsWith('https://')

/**
 * The research as catalogue input: beers on the brewery's own website count like crawled ones (they go through the
 * same name and guest-beer filters), beers from other sites become their own source; a brewery that has closed, brews
 * no beer of its own or duplicates another entry is hidden – all only with the page that shows it. Unknown ids (gone from
 * the sources) and „unclear“ change nothing. At most MAX_RESEARCHED_BEERS beers per brewery, in the order the research
 * lists them. `unusable` (V15): „beers“ entries none of whose links count (another site over http) – the build reports them.
 * `wrong` (V17): per brewery the names (normName) of beers that belong to another brewery – https page only, whatever the status.
 */
export function researchInput(
  entries: readonly ResearchEntry[],
  breweries: readonly { id: string; website: string | null }[],
): { hidden: Set<string>; web: WebRow[]; other: ResearchRow[]; unusable: string[]; wrong: Map<string, Set<string>> } {
  const site = new Map(breweries.map((b) => [b.id, host(b.website)]))
  const hidden = new Set<string>()
  const web: WebRow[] = []
  const other: ResearchRow[] = []
  const unusable: string[] = []
  const wrong = new Map<string, Set<string>>()
  for (const e of entries) {
    if (!site.has(e.id)) continue
    const names = (e.wrong ?? []).filter((w) => w.name?.trim() && https(w.url)).map((w) => normName(w.name))
    if (names.length) wrong.set(e.id, new Set(names))
    if (HIDING.includes(e.status) && e.evidence && link(e.evidence)) {
      hidden.add(e.id)
      continue
    }
    if (e.status !== 'beers') continue
    const own = site.get(e.id)
    const onSite = (b: ResearchBeer) => !!own && link(b.url) && host(b.url) === own
    const usable = e.beers.filter((b) => b.name?.trim() && (onSite(b) || https(b.url)))
    if (!usable.length) unusable.push(e.id)
    for (const b of usable.slice(0, MAX_RESEARCHED_BEERS)) {
      const abv = typeof b.abv === 'number' && b.abv > 0 && b.abv <= 20 ? b.abv : null
      const style = b.style?.trim() || null
      if (onSite(b)) {
        const u = new URL(b.url)
        web.push({ breweryId: e.id, path: u.pathname + u.search, name: b.name, abv, style })
      } else other.push({ breweryId: e.id, name: b.name, style, abv, url: b.url })
    }
  }
  return { hidden, web, other, unusable, wrong }
}

/**
 * V14: researched beers on the brewery's own website were checked against the page by the research and the fact-check
 * – they skip the crawler's heading heuristics (style word in the name, no leading digit), which dropped real names
 * like „Urvogel“ or „1250er“. They are only tidied, and guest beers of other breweries still go.
 */
export function researchedWebRows(
  rows: readonly WebRow[],
  breweryOf: ReadonlyMap<string, { name: string; website: string | null }>,
  breweryKeys: ReadonlySet<string>,
): WebRow[] {
  return rows.flatMap((w) => {
    const name = cleanName(w.name)
    const b = breweryOf.get(w.breweryId)
    if (name.length < 2 || name.length > 60 || guestBeer(name, b?.name ?? '', b?.website ?? '', breweryKeys)) return []
    return [{ ...w, name }]
  })
}
