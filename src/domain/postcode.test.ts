import { describe, expect, it } from 'vitest'
import { isPostcode, orderPlaces, parsePostcode, preferredCountries } from './postcode'

describe('parsePostcode', () => {
  it.each([
    ['74906', '74906'],
    [' 8010 ', '8010'],
    ['90210', '90210'],
    ['90210-1234', '90210'],
    ['K1A 0B1', 'K1A'],
    ['k1a0b1', 'K1A'],
    ['m5v', 'M5V'],
  ])('%s → %s', (q, code) => expect(parsePostcode(q)).toBe(code))

  it.each(['123', '123456', '8010-1234', 'D1A', 'Z9Z 9Z9', 'K1A 0B', 'Bad Rappenau', 'IPA', ''])('rejects %s', (q) =>
    expect(parsePostcode(q)).toBeNull(),
  )

  it('isPostcode follows parsePostcode', () => {
    expect(isPostcode('J3L 2C7')).toBe(true)
    expect(isPostcode('Pils')).toBe(false)
  })
})

describe('preferredCountries', () => {
  it('puts the browser region first', () => {
    expect(preferredCountries('en-US')[0]).toBe('US')
    expect(preferredCountries('fr-CA')[0]).toBe('CA')
    expect(preferredCountries('de-CH')).toEqual(['CH', 'DE', 'AT', 'US', 'CA'])
  })
  it('falls back to DACH first', () => {
    expect(preferredCountries('de')).toEqual(['DE', 'AT', 'CH', 'US', 'CA'])
    expect(preferredCountries('en-GB')).toEqual(['DE', 'AT', 'CH', 'US', 'CA'])
  })
})

describe('orderPlaces', () => {
  const hits = [
    { country: 'DE' as const, name: 'Berlin' },
    { country: 'DE' as const, name: 'Berlin Mitte' },
    { country: 'US' as const, name: 'Schenectady' },
  ]
  it('keeps one place per country, preferred first', () => {
    expect(orderPlaces(hits, preferredCountries('de-DE')).map((p) => p.name)).toEqual(['Berlin', 'Schenectady'])
    expect(orderPlaces(hits, preferredCountries('en-US')).map((p) => p.name)).toEqual(['Schenectady', 'Berlin'])
  })
})
