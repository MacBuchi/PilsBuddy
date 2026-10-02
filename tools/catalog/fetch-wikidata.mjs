// Breweries from Wikidata (CC0) via SPARQL: instance of (a subclass of) brewery, with coordinates.
//   node tools/catalog/fetch-wikidata.mjs              → probe region (R0)
//   node tools/catalog/fetch-wikidata.mjs --country DE → whole country
import { args, bboxAround, COUNTRIES, getJson, PROBE, writeRaw } from './lib.mjs'

const { country, beers } = args()
const ENDPOINT = 'https://query.wikidata.org/sparql'

// --beers: beers whose manufacturer (P176) is a brewery in one of the countries → raw/wikidata-beers.json
if (beers) {
  const q = `SELECT ?beer ?beerLabel ?brewery ?breweryLabel ?placeLabel ?abv (GROUP_CONCAT(DISTINCT ?kindLabel; separator="|") AS ?kinds) WHERE {
    VALUES ?c { ${Object.values(COUNTRIES).map((c) => `wd:${c.wikidata}`).join(' ')} }
    ?brewery wdt:P17 ?c ; wdt:P31/wdt:P279* wd:Q131734 .
    ?beer wdt:P176 ?brewery .
    OPTIONAL { ?beer wdt:P2665 ?abv }
    OPTIONAL { ?brewery wdt:P131 ?place }
    OPTIONAL { ?beer wdt:P31 ?kind . ?kind rdfs:label ?kindLabel . FILTER(LANG(?kindLabel) IN ("de", "en")) }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "de,mul,en,fr,it" . ?beer rdfs:label ?beerLabel . ?brewery rdfs:label ?breweryLabel . ?place rdfs:label ?placeLabel . }
  } GROUP BY ?beer ?beerLabel ?brewery ?breweryLabel ?placeLabel ?abv`
  const data = await getJson(`${ENDPOINT}?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' } })
  const byId = new Map()
  for (const b of data.results.bindings) {
    const id = b.beer.value.split('/').pop()
    if (byId.has(id)) continue
    const abv = Number(b.abv?.value)
    byId.set(id, {
      id: `wd:${id}`,
      name: b.beerLabel?.value && b.beerLabel.value !== id ? b.beerLabel.value : null,
      brewery: `wd:${b.brewery.value.split('/').pop()}`,
      // many brewery items have no coordinates → matched by name + place like Open Food Facts brands
      breweryName: b.breweryLabel?.value ?? null,
      breweryPlace: b.placeLabel?.value ?? null,
      abv: Number.isFinite(abv) ? abv : null,
      kinds: b.kinds?.value ? b.kinds.value.split('|') : [],
    })
  }
  writeRaw('wikidata-beers.json', [...byId.values()])
  process.exit(0)
}

if (country && !COUNTRIES[country]) throw new Error(`unknown country ${country}`)
// labels in the country's language first (Québec: French after English)
const langs = country && COUNTRIES[country].lang === 'en' ? 'en,mul,fr,de' : 'de,en'
let where
if (country) {
  where = `?item wdt:P17 wd:${COUNTRIES[country].wikidata} . ?item wdt:P625 ?coord .`
} else {
  const b = bboxAround(PROBE)
  where = `SERVICE wikibase:box { ?item wdt:P625 ?coord .
      bd:serviceParam wikibase:cornerSouthWest "Point(${b.w} ${b.s})"^^geo:wktLiteral .
      bd:serviceParam wikibase:cornerNorthEast "Point(${b.e} ${b.n})"^^geo:wktLiteral . }`
}
const query = `SELECT ?item ?itemLabel ?coord ?website ?dissolved ?countryCode ?inception ?placeLabel WHERE {
  ${where}
  ?item wdt:P31/wdt:P279* wd:Q131734 .
  OPTIONAL { ?item wdt:P856 ?website }
  OPTIONAL { ?item wdt:P576 ?dissolved }
  OPTIONAL { ?item wdt:P17/wdt:P297 ?countryCode }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P131 ?place }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langs}" . }
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
    // founding year → „SEIT …“ on the derived label; place = municipality (OSM often has no addr:city)
    founded: b.inception ? Number(b.inception.value.slice(0, 4)) || null : null,
    city: b.placeLabel?.value && !/^Q\d+$/.test(b.placeLabel.value) ? b.placeLabel.value : null,
  })
}
writeRaw(`wikidata-${country ?? 'probe'}.json`, [...byId.values()])
