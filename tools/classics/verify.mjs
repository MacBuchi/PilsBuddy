// Checks the research files against their sources: fetches every `source` URL and looks for the ABV (and the IBU,
// if given) on the page. Runs in CI (workflow „Classics sources“) because the local line is too slow; the report is
// a hint for the next manual check, never a gate – many brewery sites block bots or render with JavaScript.
//   node tools/classics/verify.mjs [--out report.md]
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const FILES = ['ca.json']
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null
const UA = 'PilsBuddy-classics-check/1.0 (+https://github.com/MacBuchi/PilsBuddy)'

const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')

/** 5 → „5 %“, „5.0%“, „5,0 %“; 6.5 → „6.5%“, „6,5 %“ – followed by a percent sign or „ABV“/„alc“. */
export function hasAbv(page, abv) {
  const forms = new Set([String(abv), abv.toFixed(1), abv.toFixed(1).replace('.', ','), String(abv).replace('.', ',')])
  return [...forms].some((f) => new RegExp(`(^|[^\\d.,])${f.replace('.', '\\.')}\\s*(%|percent|abv|alc)`, 'i').test(page))
}

export function hasIbu(page, ibu) {
  return new RegExp(`(^|\\D)${ibu}\\s*\\+?\\s*ibus?\\b|\\bibus?\\s*[:=]?\\s*${ibu}(\\D|$)`, 'i').test(page)
}

async function check(c) {
  try {
    const res = await fetch(c.source, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) })
    if (!res.ok) return { ...c, status: `HTTP ${res.status}` }
    const page = text(await res.text())
    const abv = hasAbv(page, c.abv)
    const ibu = c.ibu == null ? null : hasIbu(page, c.ibu)
    return { ...c, status: abv && ibu !== false ? 'ok' : 'differs', abvFound: abv, ibuFound: ibu }
  } catch (e) {
    return { ...c, status: `error: ${e.name}` }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const classics = FILES.flatMap((f) => JSON.parse(readFileSync(join(here, f), 'utf8')))
  const results = []
  for (let i = 0; i < classics.length; i += 6) results.push(...(await Promise.all(classics.slice(i, i + 6).map(check))))
  const mark = (v) => (v == null ? '–' : v ? '✓' : '✗')
  const lines = [
    `# Classics sources (${new Date().toISOString().slice(0, 10)})`,
    '',
    `${results.filter((r) => r.status === 'ok').length} of ${results.length} confirmed on the source page.`,
    '',
    '| id | ABV | IBU | status | source |',
    '|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | ${r.abv} ${mark(r.abvFound)} | ${r.ibu ?? ''} ${mark(r.ibuFound)} | ${r.status} | ${r.source} |`),
  ]
  const report = lines.join('\n') + '\n'
  if (out) writeFileSync(out, report)
  console.log(report)
}
