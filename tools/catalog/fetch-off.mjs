// Beers from Open Food Facts (ODbL) via the search API v2 (100 per page, ≤ 10 req/min → 7 s between pages).
//   node tools/catalog/fetch-off.mjs --country DE   (DE | AT | CH)
import { args, getJson, hasRaw, readRaw, sleep, writeRaw } from './lib.mjs'

const NAMES = { DE: 'en:germany', AT: 'en:austria', CH: 'en:switzerland' }
const { country = 'DE' } = args()
const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'brands',
  'brand_owner',
  'manufacturing_places',
  'origins',
  'emb_codes',
  'categories_tags',
  'labels_tags',
  'nutriments',
  'quantity',
  'countries_tags',
  'last_modified_t',
].join(',')

const rows = []
for (let page = 1; ; page++) {
  const url = `https://world.openfoodfacts.org/api/v2/search?categories_tags=en:beers&countries_tags=${NAMES[country]}&fields=${FIELDS}&page_size=100&page=${page}`
  // pages are kept, so a rerun after a 503 continues where it stopped
  const pageFile = `off-${country}-p${page}.json`
  const data = hasRaw(pageFile) ? readRaw(pageFile) : await getJson(url)
  if (!hasRaw(pageFile)) writeRaw(pageFile, data)
  for (const p of data.products) {
    const n = p.nutriments ?? {}
    rows.push({
      code: p.code,
      name: (p.product_name_de || p.product_name || '').trim() || null,
      brands: p.brands ?? null,
      owner: p.brand_owner ?? null,
      places: p.manufacturing_places ?? null,
      origins: p.origins ?? null,
      emb: p.emb_codes ?? null,
      abv: n.alcohol_100g ?? n.alcohol ?? null,
      categories: (p.categories_tags ?? []).filter((c) => c !== 'en:beverages' && c !== 'en:alcoholic-beverages'),
      labels: p.labels_tags ?? [],
      quantity: p.quantity ?? null,
      modified: p.last_modified_t ?? null,
    })
  }
  console.log(`page ${page}: ${rows.length}/${data.count}`)
  if (page * 100 >= data.count || data.products.length === 0) break
  if (!hasRaw(`off-${country}-p${page + 1}.json`)) await sleep(7000)
}
writeRaw(`off-${country}.json`, rows)
