import { tasteFromStyle } from './styleProfile'
import { TASTE_AXES } from './types'
import type { TasteAxis, TasteVector } from './types'

/**
 * Taste of a researched classic (Stufe N): the style estimate from style, ABV and IBU, plus deviations a
 * source states („lightly hopped“, „mild bitterness“, „rich malt“). No tasting notes are invented – every
 * delta carries the sentence's source, and the curated value is exactly this result (classics.test.ts).
 */
export interface TasteAdjust {
  axis: TasteAxis
  /** Points on the 0–100 axis, signed. */
  delta: number
  /** What the source says, short. */
  reason: string
  source: string
}

export interface ClassicFacts {
  style: string
  abv: number
  ibu?: number | null
  adjust?: readonly TasteAdjust[]
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

export function classicTaste(facts: ClassicFacts): TasteVector {
  const t = tasteFromStyle(facts.style, facts.abv, facts.ibu)
  for (const a of facts.adjust ?? []) t[a.axis] += a.delta
  for (const a of TASTE_AXES) t[a] = clamp(t[a])
  return t
}
