// Breweries from Open Brewery DB (MIT, https://www.openbrewerydb.org) – US and the Canadian provinces it covers.
//   node tools/catalog/fetch-obdb.mjs   → raw/obdb-<country>.json for every country with `obdb` in countries.json
// Closed, planned and contract breweries and bars/taprooms that brew nothing stay out; rows without coordinates
// are kept (merge.ts places them at their postcode).
// The API refuses GitHub's runners (HTTP 403 since 2026-10-11) – then the same data comes from the project's own
// dataset on GitHub (breweries.json, same fields, MIT).
import { COUNTRIES, getJson, sleep, writeRaw } from './lib.mjs'

const API = 'https://api.openbrewerydb.org/v1/breweries'
const DATASET = 'https://raw.githubusercontent.com/openbrewerydb/openbrewerydb/master/breweries.json'
/** „united_states“ → „United States“, as the dataset names countries */
const countryName = (key) => key.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

let dataset = null
async function fromApi(obdb) {
  const all = []
  for (let page = 1; ; page++) {
    const data = await getJson(`${API}?by_country=${obdb}&per_page=200&page=${page}`)
    all.push(...data)
    if (data.length < 200) return all
    await sleep(500)
  }
}
async function fromDataset(obdb) {
  dataset ??= await getJson(DATASET)
  return dataset.filter((b) => b.country === countryName(obdb))
}
const BREWING = new Set(['micro', 'nano', 'brewpub', 'regional', 'large'])
const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

for (const [country, { obdb }] of Object.entries(COUNTRIES)) {
  if (!obdb) continue
  const rows = []
  const types = {}
  let data
  try {
    data = await fromApi(obdb)
  } catch (err) {
    console.log(`${country}: API ${err.message} – dataset on GitHub instead`)
    data = await fromDataset(obdb)
  }
  for (const b of data) {
    types[b.brewery_type] = (types[b.brewery_type] ?? 0) + 1
    if (!BREWING.has(b.brewery_type)) continue
    rows.push({
      id: `obdb:${b.id}`,
      name: b.name ?? null,
      lat: num(b.latitude),
      lon: num(b.longitude),
      city: b.city ?? null,
      postcode: b.postal_code ?? null,
      state: b.state_province ?? b.state ?? null,
      website: b.website_url ?? null,
      type: b.brewery_type,
    })
  }
  console.log(`${country}: ${JSON.stringify(types)}`)
  writeRaw(`obdb-${country}.json`, rows)
}
