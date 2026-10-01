// Beers from Open Food Facts (ODbL), streamed from the daily full export (~1.3 GB gzip, TSV).
// The search API stops at page 10 for anonymous clients, the export has everything.
// Run on a runner (see .github/workflows/catalog.yml) – it downloads the whole file once.
//   node tools/catalog/fetch-off.mjs   → raw/off-DE.json, raw/off-AT.json, raw/off-CH.json
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'
import { UA, writeRaw } from './lib.mjs'

const URL = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz'
const COUNTRIES = { DE: 'en:germany', AT: 'en:austria', CH: 'en:switzerland' }

const res = await fetch(URL, { headers: { 'User-Agent': UA } })
if (!res.ok) throw new Error(`${res.status} ${URL}`)
const lines = createInterface({ input: Readable.fromWeb(res.body).pipe(createGunzip()), crlfDelay: Infinity })

let col = null
let seen = 0
const out = { DE: [], AT: [], CH: [] }
for await (const line of lines) {
  const f = line.split('\t')
  if (!col) {
    col = Object.fromEntries(f.map((name, i) => [name, i]))
    continue
  }
  if (++seen % 500000 === 0) console.log(`${seen} products scanned`)
  const cats = f[col.categories_tags] ?? ''
  if (!cats.split(',').includes('en:beers')) continue
  const countries = (f[col.countries_tags] ?? '').split(',')
  const abv = parseFloat(f[col.alcohol_100g])
  const row = {
    code: f[col.code],
    name: (f[col.product_name] || '').trim() || null,
    brands: f[col.brands] || null,
    owner: f[col.brand_owner] || null,
    places: f[col.manufacturing_places] || null,
    origins: f[col.origins] || null,
    emb: f[col.emb_codes] || null,
    abv: Number.isFinite(abv) ? abv : null,
    categories: cats.split(',').filter((c) => c !== 'en:beverages' && c !== 'en:alcoholic-beverages'),
    labels: (f[col.labels_tags] || '').split(',').filter(Boolean),
    quantity: f[col.quantity] || null,
    modified: Number(f[col.last_modified_t]) || null,
  }
  for (const [c, tag] of Object.entries(COUNTRIES)) if (countries.includes(tag)) out[c].push(row)
}
console.log(`${seen} products scanned`)
for (const [c, rows] of Object.entries(out)) writeRaw(`off-${c}.json`, rows)
