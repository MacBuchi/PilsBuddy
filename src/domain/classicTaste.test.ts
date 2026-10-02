import { describe, expect, it } from 'vitest'
import { classicTaste } from './classicTaste'
import { tasteFromStyle } from './styleProfile'

const src = 'https://example.org/beer'

describe('classicTaste', () => {
  it('is the style estimate when no source states a deviation', () => {
    expect(classicTaste({ style: 'Tripel', abv: 9, ibu: 19 })).toEqual(tasteFromStyle('Tripel', 9, 19))
  })

  it('adds the sourced deltas and stays within 0–100', () => {
    const base = tasteFromStyle('Hazy IPA', 5.5, 55)
    const t = classicTaste({
      style: 'Hazy IPA',
      abv: 5.5,
      ibu: 55,
      adjust: [
        { axis: 'bitterness', delta: -45, reason: 'mild bitterness', source: src },
        { axis: 'hopIntensity', delta: 30, reason: 'dry-hopped', source: src },
      ],
    })
    expect(t.bitterness).toBe(base.bitterness - 45)
    expect(t.hopIntensity).toBe(100)
    expect(t.body).toBe(base.body)
  })

  it('sums several deltas on one axis', () => {
    const t = classicTaste({
      style: 'Lager',
      abv: 5,
      adjust: [
        { axis: 'maltiness', delta: 10, reason: 'rich malt', source: src },
        { axis: 'maltiness', delta: -4, reason: 'dry finish', source: src },
      ],
    })
    expect(t.maltiness).toBe(tasteFromStyle('Lager', 5).maltiness + 6)
  })
})
