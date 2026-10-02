// Breweries from OpenStreetMap (ODbL) via Overpass.
//   node tools/catalog/fetch-osm.mjs              → probe region (R0)
//   node tools/catalog/fetch-osm.mjs --country DE → whole country (DE, CA, US state by state – one query times out)
//   node tools/catalog/fetch-osm.mjs --country US --part 0 --parts 3 → a third of the states → raw/osm-US.part0.json
//   node tools/catalog/fetch-osm.mjs --join      → raw/osm-XX.part*.json → raw/osm-XX.json
// The workflow runs one job per country part (own runner, own IP – Overpass limits per IP), see osmParts in lib.mjs.
import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { args, bboxAround, COUNTRIES, getJson, PROBE, RAW, readRaw, sleep, writeRaw } from './lib.mjs'

const { country, part, parts, join: joinParts } = args()

if (joinParts) {
  const files = readdirSync(RAW).filter((f) => /^osm-[A-Z]{2}\.part\d+\.json$/.test(f)).sort()
  const byCountry = new Map()
  for (const f of files) byCountry.set(f.slice(4, 6), [...(byCountry.get(f.slice(4, 6)) ?? []), f])
  for (const [c, fs] of byCountry) {
    const rows = new Map()
    for (const f of fs) for (const r of readRaw(f)) rows.set(r.id, r)
    writeRaw(`osm-${c}.json`, [...rows.values()])
    for (const f of fs) rmSync(join(RAW, f))
  }
  process.exit(0)
}
// the main instance answers 504 under load – rotate through public mirrors
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']

/**
 * Overpass answers 200 with a `remark` and partial data when a query runs out of time or memory, and a mirror without
 * the area index answers 200 with nothing – both must not count as a result (2026-10: Saxony and Hesse came back
 * empty). An empty area is asked at every mirror before it is believed.
 */
async function overpass(query) {
  let empty = null
  for (let round = 0; round < 3; round++) {
    for (const url of ENDPOINTS) {
      try {
        const data = await getJson(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(360_000) }, 2)
        if (data.remark && /error|timed? ?out|memory/i.test(data.remark)) throw new Error(`remark: ${data.remark.slice(0, 160)}`)
        if (data.elements.length) return data
        console.log(`${url}: empty`)
        if (empty && round >= 1) return empty
        empty = data
      } catch (err) {
        console.log(`${url}: ${err.message}`)
      }
    }
    await sleep(30_000)
  }
  if (empty) return empty
  throw new Error('Overpass: no complete answer from any mirror')
}

const filters = ['["craft"="brewery"]', '["microbrewery"="yes"]', '["industrial"="brewery"]']
if (country && !COUNTRIES[country]) throw new Error(`unknown country ${country}`)
const all = !country
  ? [null]
  : COUNTRIES[country].osm
    ? COUNTRIES[country].osm.map((s) => `area["ISO3166-2"="${s}"]->.a;`)
    : [`area["ISO3166-1"="${country}"][admin_level=2]->.a;`]
const areas = parts ? all.filter((_, i) => i % Number(parts) === Number(part)) : all

const elements = new Map()
for (const area of areas) {
  let scope = '(area.a)'
  if (!area) {
    const b = bboxAround(PROBE)
    scope = `(${b.s},${b.w},${b.n},${b.e})`
  }
  const query = `[out:json][timeout:300];${area ?? ''}(${filters.map((f) => `nwr${f}${scope};`).join('')});out center tags;`
  const data = await overpass(query)
  for (const el of data.elements) elements.set(`${el.type}${el.id}`, el)
  if (area) console.log(`${area.match(/"([A-Z-]+)"\]/)[1]}: ${data.elements.length} (total ${elements.size})`)
  if (areas.length > 1) await sleep(3000)
}
const rows = [...elements.values()]
  .map((el) => {
    const t = el.tags ?? {}
    return {
      id: `osm:${el.type[0]}${el.id}`,
      name: t.name ?? t.operator ?? t.brand ?? null,
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
      city: t['addr:city'] ?? null,
      postcode: t['addr:postcode'] ?? null,
      country: t['addr:country'] ?? country ?? null,
      website: t.website ?? t['contact:website'] ?? null,
      /** OSM `brewery=*` lists the beers on tap/brewed, `;`-separated. */
      beers: t.brewery ? t.brewery.split(';').map((s) => s.trim()).filter(Boolean) : [],
      kind: t.craft === 'brewery' ? 'craft' : t.industrial === 'brewery' ? 'industrial' : 'microbrewery',
      amenity: t.amenity ?? null,
      wikidata: t.wikidata ?? t['brand:wikidata'] ?? t['operator:wikidata'] ?? null,
    }
  })
  .filter((r) => r.lat != null)
writeRaw(`osm-${country ?? 'probe'}${parts ? `.part${part}` : ''}.json`, rows)
