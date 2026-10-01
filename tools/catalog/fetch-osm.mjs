// Breweries from OpenStreetMap (ODbL) via Overpass.
//   node tools/catalog/fetch-osm.mjs              → probe region (R0)
//   node tools/catalog/fetch-osm.mjs --country DE → whole country (DE state by state – one query times out)
import { args, bboxAround, getJson, PROBE, sleep, writeRaw } from './lib.mjs'

const { country } = args()
const ENDPOINT = 'https://overpass-api.de/api/interpreter'

const filters = ['["craft"="brewery"]', '["microbrewery"="yes"]', '["industrial"="brewery"]']
const DE_STATES = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH']
const areas = !country
  ? [null]
  : country === 'DE'
    ? DE_STATES.map((s) => `area["ISO3166-2"="DE-${s}"]->.a;`)
    : [`area["ISO3166-1"="${country}"][admin_level=2]->.a;`]

const elements = new Map()
for (const area of areas) {
  let scope = '(area.a)'
  if (!area) {
    const b = bboxAround(PROBE)
    scope = `(${b.s},${b.w},${b.n},${b.e})`
  }
  const query = `[out:json][timeout:300];${area ?? ''}(${filters.map((f) => `nwr${f}${scope};`).join('')});out center tags;`
  const data = await getJson(ENDPOINT, { method: 'POST', body: new URLSearchParams({ data: query }) })
  for (const el of data.elements) elements.set(`${el.type}${el.id}`, el)
  if (areas.length > 1) {
    console.log(`${area.match(/"([A-Z-]+)"\]/)[1]}: ${elements.size}`)
    await sleep(3000)
  }
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
writeRaw(`osm-${country ?? 'probe'}.json`, rows)
