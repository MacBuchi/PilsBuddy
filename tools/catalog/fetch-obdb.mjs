// Breweries from Open Brewery DB (MIT, https://www.openbrewerydb.org) – US and the Canadian provinces it covers.
//   node tools/catalog/fetch-obdb.mjs   → raw/obdb-<country>.json for every country with `obdb` in countries.json
// Closed, planned and contract breweries and bars/taprooms that brew nothing stay out; rows without coordinates
// are kept (merge.ts places them at their postcode).
import { COUNTRIES, getJson, sleep, writeRaw } from './lib.mjs'

const API = 'https://api.openbrewerydb.org/v1/breweries'
const BREWING = new Set(['micro', 'nano', 'brewpub', 'regional', 'large'])
const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

for (const [country, { obdb }] of Object.entries(COUNTRIES)) {
  if (!obdb) continue
  const rows = []
  const types = {}
  for (let page = 1; ; page++) {
    const data = await getJson(`${API}?by_country=${obdb}&per_page=200&page=${page}`)
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
    if (data.length < 200) break
    await sleep(500)
  }
  console.log(`${country}: ${JSON.stringify(types)}`)
  writeRaw(`obdb-${country}.json`, rows)
}
