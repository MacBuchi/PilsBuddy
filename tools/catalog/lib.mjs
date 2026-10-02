// Shared helpers for the regional catalogue pipeline (Stufe R). Node ≥ 20, no dependencies.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const RAW = join(dirname(fileURLToPath(import.meta.url)), 'raw')
mkdirSync(RAW, { recursive: true })

/** Public APIs ask for an identifying User-Agent with a contact. */
export const UA = 'PilsBuddy-catalog/0.1 (+https://pilsbuddy.mcbuchi.de; macbuchi.apps@gmail.com)'

/** Probe region of R0: Bad Rappenau ± 50 km. */
export const PROBE = { lat: 49.2386, lon: 9.1016, radiusKm: 50 }

/**
 * The catalogue's countries (countries.json, also read by merge.ts): Wikidata item, Open Food Facts tag, language,
 * OSM areas (ISO 3166-2, for countries one Overpass query cannot cover), Open Brewery DB country, openbeer repos and
 * the fewest breweries a complete download has. A new country is a new entry there plus the DB CHECKs.
 */
export const COUNTRIES = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'countries.json'), 'utf8'))

// `node tools/catalog/lib.mjs countries|openbeer` prints the lists the workflow loops over
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const what = process.argv[2]
  if (what === 'countries') console.log(Object.keys(COUNTRIES).join(' '))
  else if (what === 'openbeer') console.log(Object.values(COUNTRIES).flatMap((c) => c.openbeer ?? []).join(' '))
  else throw new Error('usage: lib.mjs countries|openbeer')
}

/** `--key value` arguments. */
export function args() {
  const out = {}
  const a = process.argv.slice(2)
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) out[a[i].slice(2)] = a[i + 1]?.startsWith('--') ? true : (a[++i] ?? true)
  return out
}

export function bboxAround({ lat, lon, radiusKm }) {
  const dLat = radiusKm / 111.2
  const dLon = radiusKm / (111.2 * Math.cos((lat * Math.PI) / 180))
  return { s: lat - dLat, w: lon - dLon, n: lat + dLat, e: lon + dLon }
}

export function haversineKm(a, b) {
  const r = (d) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

/** fetch with UA, retries on network errors and 429/5xx with backoff. */
export async function getJson(url, init = {}, tries = 8) {
  for (let i = 0; ; i++) {
    let res
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(60_000), ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers ?? {}) } })
    } catch (err) {
      // network blips (timeouts, resets) are retried like 5xx
      if (i + 1 >= tries) throw err
      await sleep(5000 * (i + 1))
      continue
    }
    if (res.ok) return res.json()
    if (i + 1 >= tries || ![429, 502, 503, 504].includes(res.status)) throw new Error(`${res.status} ${url.slice(0, 120)}`)
    await sleep(5000 * (i + 1))
  }
}

export const readRaw = (name) => JSON.parse(readFileSync(join(RAW, name), 'utf8'))
export const hasRaw = (name) => existsSync(join(RAW, name))
export function writeRaw(name, data) {
  writeFileSync(join(RAW, name), JSON.stringify(data, null, 1))
  console.log(`→ raw/${name} (${Array.isArray(data) ? data.length + ' rows' : 'object'})`)
}

/** Lower-case, no umlaut variants, no legal forms / filler words – for name matching. */
export function normName(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(gmbh|ag|kg|co|ohg|eg|e\.?\s?k|mbh|ug|haftungsbeschraenkt|sarl|sa)\b/g, ' ')
    .replace(/\b(privat|brauerei|brauhaus|braeu|brau|bier|biere|beer|brewery|brewing|craft|gasthaus|gasthof|und|the|der|die|das|zum|zur)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
