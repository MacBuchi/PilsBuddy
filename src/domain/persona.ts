import type { ArchetypeId, BeerDNA } from './types'

/**
 * Rule tree → archetype (Designsystem §7). Deliberately playful, not scientific.
 * Order matters: curiosity → hops → bitter+dry → malt+character → "knows everything" → easy-going.
 */
export function archetypeFor(dna: BeerDNA): ArchetypeId {
  const t = dna.taste
  const c = dna.counts
  const n = dna.curiosity / 100
  const h = t.bitterness / 100
  const hp = t.hopIntensity / 100
  const m = t.maltiness / 100
  const s = t.drinkability / 100
  const ch = t.character / 100
  const dry = t.dryness / 100

  if (c.total < 3) return 'logo'
  if (n > 0.62) return hp > 0.62 ? 'abenteurer' : 'probierer'
  // Hop-forward AND hops dominate bitterness – otherwise a classic Pils fan lands here by accident.
  if (hp > 0.72 && ch > 0.6 && hp >= h) return 'abenteurer'
  if (h > 0.66 && dry > 0.6) return 'herb'
  if (m > 0.64 && ch > 0.55) return 'philosoph'
  if (c.KNOW / c.total > 0.4 && c.KNOW >= 3) return 'kasten'
  if (s > 0.7 && ch < 0.52) return 'geniesser'
  return 'feierabend'
}
