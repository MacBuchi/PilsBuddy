import type { Pack } from '../types'

/**
 * Container facts from Open Food Facts texts: `quantity` („0,5 l“, „330 ml“, „6 x 0.33 l“, „12 fl oz“) and
 * `packaging` tags („en:glass-bottle“, „en:can“, „de:bügelflasche“). Undefined when nothing is known.
 */
const ML_PER_FL_OZ = 29.5735

export function parsePack(quantity?: string | null, packaging?: string | null): Pack | undefined {
  const q = (quantity ?? '').toLowerCase().replace(',', '.')
  const pk = `${packaging ?? ''} ${q}`.toLowerCase()
  const pack: Pack = {}
  // the single unit of a multipack: „6 x 0.33 l“ → 330
  // metric first – „12 fl oz (355 ml)“ says it exactly; US fluid ounces otherwise
  const m = q.match(/(?:\d+\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(ml|cl|l)\b/) ?? q.match(/(?:\d+\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|oz)\b/)
  if (m) {
    const unit = m[2] === 'l' ? 1000 : m[2] === 'cl' ? 10 : m[2] === 'ml' ? 1 : ML_PER_FL_OZ
    const ml = Math.round(Number(m[1]) * unit)
    // kegs, party cans and typos stay unknown
    if (ml >= 200 && ml <= 1000) pack.ml = ml
  }
  if (/\b(can|cans|dose|dosen|canette|lattina|aluminium-can|beverage-can)\b/.test(pk)) pack.can = true
  else if (/b(ü|ue|u)gel|swing|flip-?top|patent/.test(pk)) pack.swing = true
  return Object.keys(pack).length ? pack : undefined
}
