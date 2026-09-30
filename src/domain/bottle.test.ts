import { describe, expect, it } from 'vitest'
import { BEERS, getBeer } from '../data/beers'
import { GLASS, buildBottle, shapeFor } from './bottle'

describe('buildBottle', () => {
  it('gives every beer a bottle with a readable label', () => {
    for (const beer of BEERS) {
      const b = buildBottle(beer)
      expect(b.name).toBe(beer.name)
      if (b.shape !== 'can') expect(b.label).not.toBe(b.glass)
      expect(b.label).not.toBe(b.labelInk)
    }
  })

  it('is deterministic', () => {
    for (const beer of BEERS) expect(buildBottle(beer)).toEqual(buildBottle(beer))
  })

  it('picks the form from the style', () => {
    expect(shapeFor(getBeer('jever'))).toBe('longneck')
    expect(shapeFor(getBeer('erdinger'))).toBe('weizen')
    expect(shapeFor(getBeer('punk-ipa'))).toBe('can')
    expect(shapeFor(getBeer('guinness'))).toBe('stubby')
    expect(shapeFor(getBeer('duvel'))).toBe('belgian')
    expect(shapeFor(getBeer('salvator'))).toBe('steinie')
    expect(shapeFor(getBeer('augustiner'))).toBe('euro')
  })

  it('uses a swing top for Kellerbier and the Bügelverschluss tag', () => {
    expect(buildBottle(getBeer('stoertebeker')).closure).toBe('swing')
    expect(buildBottle(getBeer('flensburger')).closure).toBe('swing')
    expect(buildBottle(getBeer('jever')).closure).toBe('crown')
    expect(buildBottle(getBeer('punk-ipa')).closure).toBe('can')
  })

  it('derives glass colour from tags and style', () => {
    expect(buildBottle(getBeer('becks')).glass).toBe(GLASS.green)
    expect(buildBottle(getBeer('corona')).glass).toBe(GLASS.clear)
    expect(buildBottle(getBeer('corona')).detail).toBe('lime')
    expect(buildBottle(getBeer('koestritzer')).glass).toBe(GLASS.black)
    expect(buildBottle(getBeer('schlenkerla')).glass).toBe(GLASS.brown)
  })

  it('falls back to a longneck for unknown styles', () => {
    expect(shapeFor({ ...getBeer('jever'), style: 'Gose' })).toBe('longneck')
  })
})
