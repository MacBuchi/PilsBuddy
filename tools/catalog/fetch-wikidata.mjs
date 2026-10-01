// Breweries from Wikidata (CC0) via SPARQL: instance of (a subclass of) brewery, with coordinates.
//   node tools/catalog/fetch-wikidata.mjs              → probe region (R0)
//   node tools/catalog/fetch-wikidata.mjs --country DE → whole country
import { args, bboxAround, COUNTRIES, getJson, PROBE, writeRaw } from './lib.mjs'

const { country } = args()
const ENDPOINT = 'https://query.wikidata.org/sparql'

let where
if (country) {
  where = `?item wdt:P17 wd:${COUNTRIES[country]} . ?item wdt:P625 ?coord .`
} else {
  const b = bboxAround(PROBE)
  where = `SERVICE wikibase:box { ?item wdt:P625 ?coord .
      bd:serviceParam wikibase:cornerSouthWest "Point(${b.w} ${b.s})"^^geo:wktLiteral .
      bd:serviceParam wikibase:cornerNorthEast "Point(${b.e} ${b.n})"^^geo:wktLiteral . }`
}
const query = `SELECT ?item ?itemLabel ?coord ?website ?dissolved ?countryCode WHERE {
  ${where}
  ?item wdt:P31/wdt:P279* wd:Q131734 .
  OPTIONAL { ?item wdt:P856 ?website }
  OPTIONAL { ?item wdt:P576 ?dissolved }
  OPTIONAL { ?item wdt:P17/wdt:P297 ?countryCode }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
}`

const data = await getJson(`${ENDPOINT}?query=${encodeURIComponent(query)}`, { headers: { Accept: 'application/sparql-results+json' } })
const byId = new Map()
for (const b of data.results.bindings) {
  const id = b.item.value.split('/').pop()
  if (byId.has(id)) continue
  const [lon, lat] = b.coord.value.replace(/^Point\(|\)$/g, '').split(' ').map(Number)
  byId.set(id, {
    id: `wd:${id}`,
    name: b.itemLabel?.value === id ? null : b.itemLabel?.value,
    lat,
    lon,
    country: b.countryCode?.value ?? country ?? null,
    website: b.website?.value ?? null,
    dissolved: Boolean(b.dissolved),
  })
}
writeRaw(`wikidata-${country ?? 'probe'}.json`, [...byId.values()])
