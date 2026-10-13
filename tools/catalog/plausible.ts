import { ABV_RANGE } from '../../src/domain/styleProfile'

/**
 * V5 – plausibility of a crawled ABV against the beer's style. A value that does not fit is dropped (the beer stays,
 * its ABV counts as unknown – taste falls back to the style's typical ABV, `beerQuality()` cannot reach 3).
 *   abv-plato – 10 % or more for a style that never gets there: original gravity (°P) read as ABV („Maibock 17,5“)
 *   abv-size  – a bottle size read as ABV („Allgäuer Hell 1,0“)
 *   abv-range – anything else outside ABV_RANGE
 */
export type AbvFlag = 'abv-plato' | 'abv-size' | 'abv-range'

const SIZES = new Set([0.33, 0.5, 0.75, 1, 2])

export function checkAbv(style: string | null, abv: number | null): { abv: number | null; flag: AbvFlag | null } {
  const range = style ? ABV_RANGE[style] : undefined
  if (abv == null || !range) return { abv, flag: null }
  const [min, max] = range
  if (abv >= min - 1e-9 && abv <= max + 1e-9) return { abv, flag: null }
  const flag: AbvFlag = abv >= 10 && max < 10 ? 'abv-plato' : SIZES.has(abv) && abv < min ? 'abv-size' : 'abv-range'
  return { abv: null, flag }
}

/** One dropped value, for the build report. */
export interface PlausibilityNote {
  breweryId: string
  name: string
  style: string | null
  abv: number
  flag: AbvFlag
}

/** Report lines: counts per flag and a few examples each. */
export function plausibilityReport(notes: readonly PlausibilityNote[], examples = 10): string[] {
  const label: Record<AbvFlag, string> = { 'abv-plato': 'Stammwürze statt Alkohol', 'abv-size': 'Gebinde statt Alkohol', 'abv-range': 'passt nicht zum Stil' }
  const flags = Object.keys(label) as AbvFlag[]
  const by = (f: AbvFlag) => notes.filter((n) => n.flag === f)
  return [
    `  Plausibilität (V5): Alkohol verworfen ${notes.length} (${flags.map((f) => `${label[f]} ${by(f).length}`).join(' · ')})`,
    ...flags
      .filter((f) => by(f).length)
      .map((f) => `    ${label[f]}: ${by(f).slice(0, examples).map((n) => `${n.name} (${n.style} ${String(n.abv).replace('.', ',')} %)`).join(' · ')}`),
  ]
}
