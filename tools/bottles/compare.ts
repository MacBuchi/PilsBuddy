// Visual check of the bottle generator – writes an HTML page to open or screenshot:
//   npx tsx tools/bottles/compare.ts out.html   per beer: hand-tuned design (left, if any) vs derived (right)
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import beers from '../../src/data/beers.json' with { type: 'json' }
import { designFor } from '../../src/domain/bottles/design'
import { renderBottle } from '../../src/domain/bottles/render'
import type { BottleDesign } from '../../src/domain/bottles/types'
import type { Beer } from '../../src/domain/types'

const out = process.argv[2] ?? 'compare.html'
const nm = resolve('node_modules')
const font = (fam: string, file: string, w = '400') => `@font-face{font-family:'${fam}';font-weight:${w};src:url(file://${nm}/${file})}`
const draw = (b: Beer, d: BottleDesign) =>
  renderBottle({ design: d, beer: b.color, abv: `${b.abv.toFixed(1).replace('.', ',')} %`, seed: 1, uid: b.id + (d === b.bottle ? 'h' : 'd'), still: true })

let html = `<!doctype html><meta charset="utf-8"><style>
${font('Bricolage Grotesque Variable', '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2', '200 800')}
${font('Young Serif', '@fontsource/young-serif/files/young-serif-latin-400-normal.woff2')}
${font('UnifrakturCook', '@fontsource/unifrakturcook/files/unifrakturcook-latin-700-normal.woff2', '700')}
body{margin:0;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;font:11px sans-serif;background:#eee}
.c{background:var(--b);display:flex;justify-content:center;gap:2px;padding:14px 0 0;position:relative}
.c span{position:absolute;left:4px;top:2px;color:#000;background:#fff8;padding:1px 3px}
svg{width:90px;height:180px}</style>`
for (const b of beers as unknown as Beer[]) {
  html += `<div class="c" style="--b:${b.color}"><span>${b.id} · ${b.style}</span>${b.bottle ? draw(b, b.bottle) : ''}${draw(b, designFor(b))}</div>`
}
writeFileSync(out, html)
console.log('written', out)
