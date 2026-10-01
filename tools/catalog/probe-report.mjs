// R0: coverage numbers for the probe region (Bad Rappenau ± 50 km) from the raw downloads.
//   node tools/catalog/probe-report.mjs   (needs raw/osm-probe.json, raw/wikidata-probe.json, raw/off-*.json)
import { haversineKm, hasRaw, normName, PROBE, readRaw } from './lib.mjs'

const inRadius = (r) => haversineKm(PROBE, r) <= PROBE.radiusKm
const osm = readRaw('osm-probe.json').filter(inRadius)
const wd = readRaw('wikidata-probe.json').filter(inRadius).filter((r) => !r.dissolved)
const off = ['DE', 'AT', 'CH'].filter((c) => hasRaw(`off-${c}.json`)).flatMap((c) => readRaw(`off-${c}.json`))

// ---- breweries: OSM first, Wikidata joins by QID or name + < 300 m ----
const breweries = osm.filter((b) => b.name).map((b) => ({ ...b, sources: ['osm'], key: normName(b.name) }))
let wdJoined = 0
for (const w of wd) {
  const hit = breweries.find((b) => (b.wikidata && `wd:${b.wikidata}` === w.id) || (b.key && b.key === normName(w.name) && haversineKm(b, w) < 0.3))
  if (hit) {
    hit.sources.push('wikidata')
    wdJoined++
  } else breweries.push({ ...w, sources: ['wikidata'], key: normName(w.name), beers: [] })
}
// OSM itself has duplicates (node + building for the same brewery)
const dupes = breweries.filter((b, i) => breweries.findIndex((o) => o.key && o.key === b.key && haversineKm(o, b) < 0.3) !== i)

// ---- beers: OFF product → brewery by name tokens of brands / owner / manufacturing place ----
const tokens = (s) => normName(s).split(' ').filter((t) => t.length >= 4)
const matches = []
for (const p of off) {
  const hay = new Set([...tokens(p.brands), ...tokens(p.owner), ...tokens(p.places), ...tokens(p.name)])
  for (const b of breweries) {
    const bt = tokens(b.name)
    if (bt.length && bt.every((t) => hay.has(t))) matches.push({ brewery: b.name, beer: p.name, brands: p.brands, abv: p.abv, cats: p.categories })
  }
}
const withBeers = new Set(matches.map((m) => m.brewery))

// ---- style detection from OFF categories ----
const STYLE_HINTS = ['pils', 'helles', 'lager', 'weiss', 'weizen', 'wheat', 'dunkel', 'dark', 'schwarz', 'bock', 'export', 'maerzen', 'kellerbier', 'zwickel', 'koelsch', 'alt', 'ipa', 'pale-ale', 'stout', 'porter', 'radler', 'non-alcoholic', 'alkoholfrei', 'gose', 'rauch', 'amber', 'red-ale', 'landbier']
const styled = off.filter((p) => p.categories.some((c) => STYLE_HINTS.some((h) => c.includes(h))))

// ---- country totals (if downloaded) ----
console.log('Länder (OSM-Brauereien mit Namen / Wikidata aktiv / OFF-Biere):')
for (const c of ['DE', 'AT', 'CH']) {
  const n = (f, fn) => (hasRaw(f) ? fn(readRaw(f)) : '–')
  console.log(`  ${c}: ${n(`osm-${c}.json`, (r) => r.filter((b) => b.name).length)} / ${n(`wikidata-${c}.json`, (r) => r.filter((b) => !b.dissolved).length)} / ${n(`off-${c}.json`, (r) => r.length)}`)
}
console.log('')

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '–')
console.log(`Brauereien im Radius: OSM ${osm.length} (mit Namen ${osm.filter((b) => b.name).length}), Wikidata ${wd.length} (davon ${wdJoined} in OSM wiedergefunden)`)
console.log(`Zusammengeführt: ${breweries.length}, Verdacht auf Duplikat: ${dupes.length}`)
console.log(`OSM brewery=* (Bierliste am Objekt): ${osm.filter((b) => b.beers.length).length}, Website: ${osm.filter((b) => b.website).length}, Ort: ${osm.filter((b) => b.city).length}`)
console.log(`OFF-Biere geladen: ${off.length}, mit ABV: ${pct(off.filter((p) => p.abv != null).length, off.length)}, Stil erkennbar: ${pct(styled.length, off.length)}`)
console.log(`OFF→Brauerei-Treffer im Radius: ${matches.length} Biere bei ${withBeers.size} von ${breweries.length} Brauereien (${pct(withBeers.size, breweries.length)})`)
console.log('\nBrauereien mit Bieren:')
for (const b of withBeers) console.log(' ', b, '→', matches.filter((m) => m.brewery === b).map((m) => m.beer).slice(0, 6).join(' · '))
const rowBytes = JSON.stringify(breweries[0] ?? {}).length
console.log(`\nDatenmenge grob: ~${rowBytes} B je Brauerei, ~${Math.round((breweries.length * rowBytes + matches.length * 120) / 1024)} KB für die ganze Probe-Region`)
