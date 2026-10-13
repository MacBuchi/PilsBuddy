import { describe, expect, it } from 'vitest'
import beers from '../../src/data/beers.json'
import { ABV_RANGE, STYLE_PROFILES } from '../../src/domain/styleProfile'
import type { Beer } from '../../src/domain/types'
import ca from './ca.json'
import eu from './eu.json'
import us from './us.json'

/**
 * V7 – every curated beer has a source. The North American classics carry it in us.json / ca.json (with their taste
 * evidence); the hand-made beers (DE/EU) in eu.json: source, check date, the ABV read on that page and the style.
 * Their taste stays hand-made – eu.json only backs the facts.
 */
interface Provenance {
  id: string
  source: string
  verified: string
  style: string
  /** null: the source only gives an upper bound (alcohol-free: „< 0,5 % vol“) */
  abv: number | null
  abvMax?: number
  note: string
}

const curated = beers as Beer[]
const records = eu as Provenance[]
const classicIds = new Set([...us, ...ca].map((c) => c.id))

describe('provenance of the curated beers (V7)', () => {
  it('every curated beer has exactly one source record', () => {
    const euIds = records.map((r) => r.id)
    expect(new Set(euIds).size).toBe(euIds.length)
    for (const id of euIds) expect(classicIds.has(id), `${id} is a classic`).toBe(false)
    const covered = new Set([...classicIds, ...euIds])
    expect(curated.filter((b) => !covered.has(b.id)).map((b) => b.id)).toEqual([])
    expect(euIds.filter((id) => !curated.some((b) => b.id === id))).toEqual([])
  })

  it('cites an https source and a check date', () => {
    for (const r of records) {
      expect(r.source, r.id).toMatch(/^https:\/\//)
      expect(r.verified, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.note.length, r.id).toBeGreaterThan(5)
    }
  })

  it('beers.json holds what the source says', () => {
    for (const r of records) {
      const b = curated.find((x) => x.id === r.id)!
      expect(b.style, r.id).toBe(r.style)
      if (r.abv != null) expect(b.abv, r.id).toBe(r.abv)
      else expect(b.abv, r.id).toBeLessThanOrEqual(r.abvMax!)
    }
  })

  it('every curated beer has a known style and an ABV that fits it', () => {
    for (const b of curated) {
      expect(Object.hasOwn(STYLE_PROFILES, b.style), `${b.id}: ${b.style}`).toBe(true)
      const [min, max] = ABV_RANGE[b.style]
      expect(b.abv, `${b.id}: ${b.style} ${b.abv}`).toBeGreaterThanOrEqual(min)
      expect(b.abv, `${b.id}: ${b.style} ${b.abv}`).toBeLessThanOrEqual(max)
    }
  })
})
