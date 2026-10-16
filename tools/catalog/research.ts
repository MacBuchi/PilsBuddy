// V12: researched beers – agents looked up breweries the crawler and the open databases had no beer for
// (tools/catalog/research/*.json, every beer and every hidden brewery with the page that shows it).
import type { WebRow } from './merge'

export type ResearchStatus = 'beers' | 'no-own-beer' | 'closed' | 'unclear'
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
 * same name and guest-beer filters), beers from other sites become their own source; a brewery that has closed or
 * brews no beer of its own is hidden – both only with the page that shows it. Unknown ids (gone from the sources) and
 * „unclear“ change nothing. At most MAX_RESEARCHED_BEERS beers per brewery, in the order the research lists them.
 */
export function researchInput(
  entries: readonly ResearchEntry[],
  breweries: readonly { id: string; website: string | null }[],
): { hidden: Set<string>; web: WebRow[]; other: ResearchRow[] } {
  const site = new Map(breweries.map((b) => [b.id, host(b.website)]))
  const hidden = new Set<string>()
  const web: WebRow[] = []
  const other: ResearchRow[] = []
  for (const e of entries) {
    if (!site.has(e.id)) continue
    if ((e.status === 'closed' || e.status === 'no-own-beer') && e.evidence && link(e.evidence)) {
      hidden.add(e.id)
      continue
    }
    if (e.status !== 'beers') continue
    const own = site.get(e.id)
    const onSite = (b: ResearchBeer) => !!own && link(b.url) && host(b.url) === own
    const usable = e.beers.filter((b) => b.name?.trim() && (onSite(b) || https(b.url)))
    for (const b of usable.slice(0, MAX_RESEARCHED_BEERS)) {
      const abv = typeof b.abv === 'number' && b.abv > 0 && b.abv <= 20 ? b.abv : null
      const style = b.style?.trim() || null
      if (onSite(b)) {
        const u = new URL(b.url)
        web.push({ breweryId: e.id, path: u.pathname + u.search, name: b.name, abv, style })
      } else other.push({ breweryId: e.id, name: b.name, style, abv, url: b.url })
    }
  }
  return { hidden, web, other }
}
