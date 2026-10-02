// Bundle report for CI („Lint · Test · Build“): raw + gzip size of every file in dist/assets, the entry chunk
// against a budget. The entry is what the service worker caches for offline use (see vite.config.ts), so it
// is the number that matters. Usage: node tool/bundle_size.mjs [dist] [budget kB gzip]
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dir = process.argv[2] ?? 'dist'
const budget = Number(process.argv[3] ?? 260)
const kb = (n) => (n / 1024).toFixed(1)

const html = readFileSync(join(dir, 'index.html'), 'utf8')
const entry = html.match(/src="\/assets\/([^"]+\.js)"/)?.[1]
const rows = readdirSync(join(dir, 'assets'))
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => {
    const buf = readFileSync(join(dir, 'assets', f))
    return { f, raw: buf.length, gz: gzipSync(buf).length }
  })
  .sort((a, b) => b.gz - a.gz)

const main = rows.find((r) => r.f === entry)
if (!main) throw new Error(`entry chunk not found in ${dir}/index.html`)
const ok = main.gz / 1024 <= budget

console.log(`### Bundle\n`)
console.log(`Entry chunk \`${entry}\`: **${kb(main.gz)} kB gzip** (budget ${budget} kB) ${ok ? '✅' : '❌'}\n`)
console.log('| file | raw kB | gzip kB |\n|---|---:|---:|')
for (const r of rows.slice(0, 8)) console.log(`| ${r.f} | ${kb(r.raw)} | ${kb(r.gz)} |`)
if (!ok) process.exitCode = 1
