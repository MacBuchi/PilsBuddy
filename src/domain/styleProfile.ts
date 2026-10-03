import { TASTE_AXES } from './types'
import type { TasteVector } from './types'

/**
 * Style profiles for beers we only know from open data (OSM, Open Food Facts, Wikidata): no tasting
 * notes, just a name, maybe a category and an ABV. `normalizeStyle` finds the style in those texts,
 * `tasteFromStyle` turns it into the 8 taste axes – an estimate, shown as „Stil-Schätzung“ in the UI.
 *
 * The base profiles are the rounded means of the curated beers of each style (beers.json, 2026-10);
 * styles without a curated beer (marked „hand“) are set between their neighbours. Kept as a fixed table
 * so adding a curated beer never silently shifts thousands of estimates.
 *
 * North American and Belgian/British styles (Stufe N, marked „bjcp“) are placed from the BJCP 2021 style
 * guidelines (typical ABV, IBU, SRM and the described impression) between the neighbouring profiles.
 */

/** Order of the numbers in `taste`: see TASTE_AXES. */
interface StyleProfile {
  /** Typical ABV – the estimate shifts body, malt and drinkability for stronger/weaker beers. */
  abv: number
  /** Typical beer colour (card background, clear glass fill). */
  color: string
  taste: readonly [number, number, number, number, number, number, number, number]
}

// bitterness, hopIntensity, maltiness, sweetness, dryness, body, drinkability, character
export const STYLE_PROFILES: Record<string, StyleProfile> = {
  Pils: { abv: 4.8, color: '#E8C355', taste: [61, 50, 34, 26, 61, 36, 70, 54] },
  Helles: { abv: 5, color: '#F2C95B', taste: [25, 30, 65, 53, 30, 47, 90, 53] },
  Lager: { abv: 4.9, color: '#EDC857', taste: [34, 30, 35, 38, 46, 33, 81, 34] },
  Export: { abv: 5.4, color: '#EDC453', taste: [33, 28, 53, 50, 38, 48, 83, 48] },
  Märzen: { abv: 5.7, color: '#D9902F', taste: [30, 25, 70, 55, 30, 60, 72, 60] }, // hand
  Landbier: { abv: 5, color: '#D9A040', taste: [30, 30, 62, 48, 32, 52, 80, 52] }, // hand
  Kellerbier: { abv: 5.1, color: '#D9A33D', taste: [35, 38, 73, 48, 30, 63, 73, 65] },
  Zwickel: { abv: 5.1, color: '#DDAA45', taste: [32, 35, 66, 48, 30, 55, 78, 60] }, // hand
  Weißbier: { abv: 5.3, color: '#D5A142', taste: [16, 19, 61, 55, 25, 64, 72, 66] },
  'Dunkles Weißbier': { abv: 5.3, color: '#8A4A1E', taste: [15, 15, 75, 60, 22, 68, 68, 70] }, // hand
  'Alkoholfreies Weißbier': { abv: 0.4, color: '#E8B24A', taste: [15, 15, 45, 58, 20, 35, 68, 35] },
  Dunkles: { abv: 3.8, color: '#3A2012', taste: [15, 15, 65, 65, 25, 45, 75, 50] },
  Schwarzbier: { abv: 4.8, color: '#2B1A12', taste: [40, 30, 85, 45, 45, 60, 70, 75] },
  Bock: { abv: 6.5, color: '#6E3A18', taste: [40, 30, 85, 55, 35, 80, 45, 85] },
  Doppelbock: { abv: 7.2, color: '#6B3918', taste: [30, 22, 95, 67, 27, 90, 37, 92] },
  Rauchbier: { abv: 5.1, color: '#6B3316', taste: [40, 20, 90, 35, 40, 80, 30, 100] },
  Kölsch: { abv: 4.8, color: '#EFCA58', taste: [33, 38, 38, 38, 48, 30, 93, 45] },
  Altbier: { abv: 4.8, color: '#944F21', taste: [60, 50, 73, 33, 55, 60, 65, 73] },
  'Pale Ale': { abv: 5.5, color: '#D98F35', taste: [61, 85, 45, 31, 53, 54, 60, 76] },
  IPA: { abv: 5.9, color: '#DF9D36', taste: [73, 98, 43, 33, 60, 53, 48, 85] },
  Amber: { abv: 5.3, color: '#B5652A', taste: [40, 40, 68, 45, 40, 55, 65, 65] }, // hand
  Stout: { abv: 4.2, color: '#1E120C', taste: [50, 25, 90, 30, 65, 75, 50, 90] },
  Porter: { abv: 5.5, color: '#2A160C', taste: [45, 30, 88, 45, 50, 72, 50, 85] }, // hand
  'Belgian Strong Ale': { abv: 8.5, color: '#F1CE5C', taste: [55, 55, 55, 45, 75, 70, 35, 95] },
  'Abbey Blonde': { abv: 6.6, color: '#E5A93A', taste: [25, 25, 70, 75, 20, 65, 55, 70] },
  Trappist: { abv: 9, color: '#4B2414', taste: [30, 25, 90, 70, 30, 95, 30, 95] },
  Alkoholfrei: { abv: 0.5, color: '#E9CA65', taste: [54, 40, 25, 24, 64, 18, 61, 35] },
  'Berliner Weisse': { abv: 2.5, color: '#F0DC8A', taste: [10, 10, 20, 40, 40, 15, 70, 70] },
  Gose: { abv: 4.5, color: '#EBD27A', taste: [15, 15, 25, 30, 55, 25, 70, 80] }, // hand
  Radler: { abv: 2.5, color: '#F2DB7A', taste: [10, 10, 20, 75, 20, 20, 90, 25] }, // hand
  'American Lager': { abv: 4.8, color: '#F0D46A', taste: [20, 15, 22, 30, 58, 22, 90, 18] }, // bjcp 1B
  'Light Lager': { abv: 4.2, color: '#F4E08A', taste: [12, 10, 14, 25, 62, 12, 93, 10] }, // bjcp 1A
  'Cream Ale': { abv: 5, color: '#EFD06A', taste: [22, 20, 32, 38, 48, 28, 86, 30] }, // bjcp 1C
  'Blonde Ale': { abv: 4.8, color: '#EFCD60', taste: [24, 24, 38, 38, 46, 32, 86, 32] }, // bjcp 18A
  'Wheat Ale': { abv: 4.9, color: '#EBC560', taste: [22, 25, 42, 38, 45, 38, 82, 40] }, // bjcp 1D
  Witbier: { abv: 5, color: '#F2DC8A', taste: [12, 12, 40, 48, 42, 40, 82, 68] }, // bjcp 24A
  'California Common': { abv: 4.9, color: '#B9702E', taste: [55, 50, 60, 35, 48, 48, 70, 65] }, // bjcp 19B
  Bitter: { abv: 4.6, color: '#C07A30', taste: [52, 42, 55, 32, 52, 38, 76, 55] }, // bjcp 11
  'Brown Ale': { abv: 5.3, color: '#6B3A1A', taste: [32, 28, 75, 45, 35, 55, 66, 60] }, // bjcp 13B/19C
  'Scotch Ale': { abv: 6, color: '#8A421A', taste: [20, 12, 88, 62, 25, 70, 55, 72] }, // bjcp 14/17C
  'Double IPA': { abv: 8.3, color: '#D98E2E', taste: [88, 100, 55, 42, 52, 70, 30, 92] }, // bjcp 22A
  'Hazy IPA': { abv: 6.8, color: '#E8B04A', taste: [40, 100, 45, 55, 30, 68, 52, 85] }, // bjcp 21C
  'Milk Stout': { abv: 5.5, color: '#1E120C', taste: [32, 18, 85, 72, 22, 75, 55, 80] }, // bjcp 16A
  'Imperial Stout': { abv: 10, color: '#140C08', taste: [60, 35, 100, 62, 32, 100, 18, 100] }, // bjcp 20C
  Barleywine: { abv: 10.5, color: '#9A4A1E', taste: [70, 60, 98, 70, 25, 98, 15, 98] }, // bjcp 22C
  Saison: { abv: 6.5, color: '#E5B04A', taste: [38, 35, 40, 28, 78, 42, 62, 85] }, // bjcp 25B
  Tripel: { abv: 8.8, color: '#E9BC4A', taste: [40, 35, 52, 42, 68, 62, 40, 90] }, // bjcp 26C
  Dubbel: { abv: 7, color: '#7A3B1A', taste: [24, 18, 85, 65, 30, 72, 48, 85] }, // bjcp 26B
  Quadrupel: { abv: 10, color: '#5A2A14', taste: [28, 20, 95, 75, 25, 95, 25, 98] }, // bjcp 26D
  'Sour Ale': { abv: 6, color: '#B0532A', taste: [10, 12, 35, 42, 62, 38, 62, 92] }, // bjcp 23B/28
}

/** Unknown style: a plain, middle-of-the-road beer. */
const NEUTRAL: StyleProfile = { abv: 5, color: '#E6BC52', taste: [40, 35, 50, 45, 42, 45, 70, 50] }

/**
 * Style patterns, most specific first (a „Weizenbock“ is a Bock, an „alkoholfreies Weizen“ is not a
 * Weißbier). Matched against lower-case text with umlauts kept; ae/oe/ue spellings are covered.
 */
const PATTERNS: [RegExp, string][] = [
  [/radler|shandy|alster|biermisch|bier-?mix|beer-based|mixed-drinks/, 'Radler'],
  [/berliner[ -]weiss/, 'Berliner Weisse'],
  [/\bgose\b/, 'Gose'],
  [/\bsour\b|flanders|kriek|lambic|gueuze|geuze|wild ale|framboise/, 'Sour Ale'],
  [/rauch|smoked/, 'Rauchbier'],
  // Salvator, Optimator … – unless an English style follows („Navigator IPA“)
  [/eisbock|doppel[ -]?bock|\b\w+ator\b(?!.*\b(ipa|ale|stout|porter|lager)\b)/, 'Doppelbock'],
  [/\bbock|bock\b|maibock|festbock|weizenbock|bock-beers/, 'Bock'],
  [/barley ?wine/, 'Barleywine'],
  [/trappist/, 'Trappist'],
  [/quadrupel|\bquad\b|dark strong/, 'Quadrupel'],
  // English „triple“ is a Tripel only next to a Belgian word („Abbey Triple“), not in „Triple Berry“ or „Triple Play“
  [/tripel|(belgian|abbey|trappist|farmhouse|monk'?s?) triple|triple (ale|blonde?)\b/, 'Tripel'],
  [/dubbel|belgian dark ale/, 'Dubbel'],
  // „Leffe Blonde“ is a Belgian abbey beer, „805 Blonde Ale“ an American blonde
  [/abbey|abtei|abdij|blonde-ales?|\bblond(e)?\b(?! ale)/, 'Abbey Blonde'],
  [/blonde? ale|golden ale/, 'Blonde Ale'],
  [/belgian-strong|strong ale/, 'Belgian Strong Ale'],
  [/imperial (\w+ )?stout|russian imperial/, 'Imperial Stout'],
  [/milk stout|sweet stout|cream stout/, 'Milk Stout'],
  [/stout/, 'Stout'],
  [/porter/, 'Porter'],
  [/double ipa|imperial ipa|triple ipa|\bd?dipa\b|\biipa\b/, 'Double IPA'],
  [/hazy (ipa|india)|\bneipa\b|new england|\bne[ -]ipa\b/, 'Hazy IPA'],
  [/\bipa\b|india pale|-ipa\b/, 'IPA'],
  [/cream ale/, 'Cream Ale'],
  [/california common|steam beer/, 'California Common'],
  [/brown ale|nut brown/, 'Brown Ale'],
  [/scotch ale|wee heavy|scottish|\d+ shilling|\b\d{2,3}\/-/, 'Scotch Ale'],
  [/\besb\b|special bitter|best bitter|english bitter|bitter ale|^bitter$/, 'Bitter'],
  [/witbier|\bwit\b|blanche|white ale|belgian white/, 'Witbier'],
  [/wheat ale|american wheat/, 'Wheat Ale'],
  // „Saisonbier“ is German for a seasonal beer – the word boundary keeps it out
  [/\bsaison\b|farmhouse/, 'Saison'],
  [/\bamber|red[ -]ale|wiener|vienna/, 'Amber'],
  [/pale[ -]ale|\bapa\b|session ale|\bales\b|\bale\b/, 'Pale Ale'],
  [/k(ö|oe|o)lsch|\bwiess\b/, 'Kölsch'],
  [/\balt(bier)?\b|altbier/, 'Altbier'],
  [/schwarz|black lager/, 'Schwarzbier'],
  [/(dunkl\w*|dark)[ -](hefe)?(weiz|weiss|weiß|wheat)|(weiz\w*|weiss\w*|weiß\w*)[ -]dunkel/, 'Dunkles Weißbier'],
  [/weiz|kristall?\b|weißbier|weissbier|\bweiss(e)?\b|\bweiße\b|wheat|hefe/, 'Weißbier'],
  [/keller|ungespundet/, 'Kellerbier'],
  [/zwick/, 'Zwickel'],
  [/m(ä|ae|a)rzen|festbier|oktoberfest|wiesn/, 'Märzen'],
  [/export|dortmunder/, 'Export'],
  [/dunkel|dunkles|dark-lagers?|dark lager|braunbier/, 'Dunkles'],
  [/pils|pilsner|pilsener|\bherb\b|feinherb|edelherb/, 'Pils'],
  [/landbier/, 'Landbier'],
  [/\bhell(es)?\b|helles|munich-helles/, 'Helles'],
  [/\blite\b|\blight\b/, 'Light Lager'],
  [/american (adjunct )?lager|canadian lager|adjunct lager/, 'American Lager'],
  [/lager|vollbier/, 'Lager'],
]

const ALCOHOL_FREE = /alkoholfrei|non[- ]?alcoholic|alcohol[- ]free|sans alcool|\b0[,.]0\b|\bnaturradler 0/

function findStyle(text: string): string | null {
  for (const [re, style] of PATTERNS) if (re.test(text)) return style
  return null
}

/**
 * The style of a beer from its texts, most telling first (product name before categories), or null.
 * An ABV ≤ 0.5 % or an „alkoholfrei“ makes it an alcohol-free style (Radler stays Radler).
 */
export function normalizeStyle(texts: readonly (string | null | undefined)[], abv?: number | null): string | null {
  const parts = texts.filter((t): t is string => !!t).map((t) => t.toLowerCase().replace(/[_:]/g, ' '))
  let style: string | null = null
  for (const t of parts) {
    style = findStyle(t)
    if (style) break
  }
  const all = parts.join(' ')
  const free = ALCOHOL_FREE.test(all) || (abv != null && abv <= 0.5)
  if (!free || style === 'Radler') return style
  return style === 'Weißbier' || style === 'Dunkles Weißbier' ? 'Alkoholfreies Weißbier' : 'Alkoholfrei'
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

export function styleProfile(style: string | null | undefined): StyleProfile {
  return (style && STYLE_PROFILES[style]) || NEUTRAL
}

/** Typical colour of a style (unknown → golden). */
export const styleColor = (style: string | null | undefined): string => styleProfile(style).color

/**
 * Taste estimate from the style, nudged by ABV (per % above the style's typical ABV: more body and
 * malt, a little sweeter, less drinkable) and IBU if known (sets bitterness, pulls hop intensity along).
 * Deterministic; unknown styles get a neutral profile.
 */
export function tasteFromStyle(style: string | null | undefined, abv?: number | null, ibu?: number | null): TasteVector {
  const p = styleProfile(style)
  const t = Object.fromEntries(TASTE_AXES.map((a, i) => [a, p.taste[i]])) as TasteVector
  if (abv != null && Number.isFinite(abv) && p.abv > 1) {
    const d = Math.max(-3, Math.min(4, abv - p.abv))
    t.body += 5 * d
    t.maltiness += 3 * d
    t.sweetness += 2 * d
    t.character += 2 * d
    t.drinkability -= 5 * d
  }
  if (ibu != null && Number.isFinite(ibu) && ibu > 0) {
    const bitter = 10 + ibu * 2
    t.bitterness = bitter
    t.hopIntensity = (t.hopIntensity + bitter) / 2
  }
  for (const a of TASTE_AXES) t[a] = clamp(t[a])
  return t
}
