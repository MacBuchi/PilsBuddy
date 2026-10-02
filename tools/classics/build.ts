// Researched classics (Stufe N) → curated beers.
//   npm run classics:build
// Reads tools/classics/<country>.json (facts with sources, adjust deltas, texts DE + EN) and writes the beers into
// src/data/beers.json and their English texts into src/data/beers.en.json. Entries the research files don't own
// stay byte-for-byte; owned ones are replaced in place, new ones appended. Taste = classicTaste(facts), never by hand.
/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classicBeer, CLASSIC_FILES, englishTexts, formatBeer, formatEnglish } from './classics'
import type { Classic } from './classics'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const BEERS = join(root, 'src/data/beers.json')
const EN = join(root, 'src/data/beers.en.json')

const classics: Classic[] = CLASSIC_FILES.flatMap((f) => JSON.parse(readFileSync(join(here, f), 'utf8')) as Classic[])
const owned = new Map(classics.map((c) => [c.id, c]))

// the array text split into its entries, so untouched beers keep their hand formatting
const text = readFileSync(BEERS, 'utf8')
const parts = text.slice(2, -3).split(/,\n(?= {2}\{)/)
const seen = new Set<string>()
const out = parts.map((p) => {
  const beer = JSON.parse(p) as { id: string }
  const c = owned.get(beer.id)
  if (!c) return p
  seen.add(c.id)
  return formatBeer(classicBeer(c, beer as never))
})
for (const c of classics) if (!seen.has(c.id)) out.push(formatBeer(classicBeer(c)))
writeFileSync(BEERS, `[\n${out.join(',\n')}\n]\n`)

const en = JSON.parse(readFileSync(EN, 'utf8')) as Parameters<typeof englishTexts>[0]
writeFileSync(EN, formatEnglish(englishTexts(en, classics)))
console.log(`${classics.length} classics → beers.json (${classics.length - seen.size} new) · beers.en.json`)
