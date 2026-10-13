import { describe, expect, it } from 'vitest'
import { breweryProfile, profileRegion } from './breweryProfile'
import type { Country } from './regionalBeer'
import { STYLE_PROFILES } from './styleProfile'

const at = (lat: number, lon: number, name = 'Brauerei Test', country: Country = 'DE') => ({ name, lat, lon, country })

describe('profileRegion', () => {
  it('finds the beer cities and Bavaria’s halves', () => {
    expect(profileRegion({ lat: 50.94, lon: 6.95 }, 'DE')).toBe('koeln')
    expect(profileRegion({ lat: 51.22, lon: 6.78 }, 'DE')).toBe('duesseldorf')
    expect(profileRegion({ lat: 49.89, lon: 10.9 }, 'DE')).toBe('bamberg')
    expect(profileRegion({ lat: 48.14, lon: 11.58 }, 'DE')).toBe('muenchen')
    expect(profileRegion({ lat: 49.45, lon: 11.08 }, 'DE')).toBe('franken') // Nürnberg
    expect(profileRegion({ lat: 49.79, lon: 9.95 }, 'DE')).toBe('franken') // Würzburg
    expect(profileRegion({ lat: 49.01, lon: 12.1 }, 'DE')).toBe('altbayern') // Regensburg
    expect(profileRegion({ lat: 47.86, lon: 12.12 }, 'DE')).toBe('altbayern') // Rosenheim
    expect(profileRegion({ lat: 53.55, lon: 9.99 }, 'DE')).toBe('norden') // Hamburg
  })

  it('leaves the rest to the country', () => {
    expect(profileRegion({ lat: 48.78, lon: 9.18 }, 'DE')).toBeNull() // Stuttgart
    expect(profileRegion({ lat: 50.98, lon: 11.03 }, 'DE')).toBeNull() // Erfurt, north of Franken
    expect(profileRegion({ lat: 49.24, lon: 9.1 }, 'DE')).toBeNull() // Bad Rappenau
    // a point inside the Köln circle but in another country never gets a German region
    expect(profileRegion({ lat: 50.94, lon: 6.95 }, 'AT')).toBeNull()
  })

  it('takes the nearer city where two circles overlap', () => {
    // Leverkusen-ish: 14 km to Köln, 22 km to Düsseldorf
    expect(profileRegion({ lat: 51.03, lon: 7.0 }, 'DE')).toBe('koeln')
  })
})

describe('breweryProfile', () => {
  it('uses the region, else the country', () => {
    expect(breweryProfile(at(49.89, 10.9))).toEqual({ region: 'bamberg', country: 'DE', styles: ['Rauchbier', 'Kellerbier', 'Lager'], basis: 'region' })
    expect(breweryProfile(at(48.78, 9.18))).toMatchObject({ region: null, basis: 'country', styles: ['Pils', 'Export', 'Weißbier'] })
    expect(breweryProfile(at(48.21, 16.37, 'Brauerei Wien', 'AT')).styles[0]).toBe('Märzen')
    expect(breweryProfile(at(45.52, -122.68, 'Rose City Brewing', 'US')).styles).toEqual(['IPA', 'Pale Ale', 'American Lager'])
  })

  it('puts a style the name spells out first', () => {
    const p = breweryProfile(at(48.14, 11.58, 'Weissbräu Schwendl'))
    expect(p).toMatchObject({ basis: 'name', region: 'muenchen' })
    expect(p.styles).toEqual(['Weißbier', 'Helles', 'Märzen'])
    expect(breweryProfile(at(53.55, 9.99, 'Kölsch-Brauhaus Nord')).styles).toEqual(['Kölsch', 'Pils', 'Export'])
  })

  it('does not read styles into unrelated names', () => {
    for (const name of ['Klosterbrauerei Andechs', 'Alte Brauerei', 'Lagerhaus Brewing', 'Lighthouse Brewing', 'Hellerbräu', 'Gosebach'])
      expect(breweryProfile(at(53.55, 9.99, name)).basis).not.toBe('name')
  })

  it('names only known styles, at most three, without duplicates', () => {
    const points = [at(50.94, 6.95), at(51.22, 6.78), at(51.51, 7.47), at(51.34, 12.37), at(51.9, 10.43), at(52.52, 13.4), at(49.45, 11.08), at(49.01, 12.1), at(53.55, 9.99)]
    const countries: Country[] = ['DE', 'AT', 'CH', 'US', 'CA']
    for (const p of [...points, ...countries.map((c) => at(0, 0, 'Brauerei Weizen', c))]) {
      const { styles } = breweryProfile(p)
      expect(styles.length).toBeGreaterThan(0)
      expect(styles.length).toBeLessThanOrEqual(3)
      expect(new Set(styles).size).toBe(styles.length)
      for (const s of styles) expect(Object.hasOwn(STYLE_PROFILES, s), s).toBe(true)
    }
  })
})
