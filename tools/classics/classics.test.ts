import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import beers from '../../src/data/beers.json'
import en from '../../src/data/beers.en.json'
import { classicTaste } from '../../src/domain/classicTaste'
import { STYLE_PROFILES } from '../../src/domain/styleProfile'
import { TASTE_AXES } from '../../src/domain/types'
import type { Beer } from '../../src/domain/types'
import { classicBeer, CLASSIC_FILES } from './classics'
import type { Classic } from './classics'

const here = dirname(fileURLToPath(import.meta.url))
const classics = CLASSIC_FILES.flatMap((f) => JSON.parse(readFileSync(join(here, f), 'utf8')) as Classic[])
const curated = beers as unknown as Beer[]
const byId = new Map(curated.map((b) => [b.id, b]))
const URL = /^https:\/\/[^\s]+\.[^\s]+$/

describe('researched classics', () => {
  it('have unique, curated-style ids', () => {
    const ids = classics.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id, id).toMatch(/^(?!r-)[a-z0-9-]{1,64}$/)
  })

  it('cite a source and a check date for every record and every taste deviation', () => {
    for (const c of classics) {
      expect(c.source, c.id).toMatch(URL)
      expect(c.verified, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      for (const a of c.adjust ?? []) {
        expect(TASTE_AXES, c.id).toContain(a.axis)
        expect(a.reason.length, c.id).toBeGreaterThan(5)
        expect(a.source, c.id).toMatch(URL)
        expect(Math.abs(a.delta), c.id).toBeLessThanOrEqual(50)
      }
    }
  })

  it('use canonical styles and plausible numbers', () => {
    for (const c of classics) {
      expect(STYLE_PROFILES[c.style], `${c.id}: ${c.style}`).toBeDefined()
      expect(c.abv, c.id).toBeGreaterThan(0)
      expect(c.abv, c.id).toBeLessThanOrEqual(20)
      if (c.ibu != null) expect(c.ibu, c.id).toBeLessThanOrEqual(120)
      expect(c.de.tags.length, c.id).toBe(c.en.tags.length)
    }
  })

  it('are in beers.json exactly as the build derives them – taste from the evidence, not by hand', () => {
    for (const c of classics) {
      const beer = byId.get(c.id)
      expect(beer, `${c.id} missing – run npm run classics:build`).toBeDefined()
      expect(beer!.taste, c.id).toEqual(classicTaste(c))
      const { bottle: _b, reference: _r, ...rest } = beer!
      expect(rest, c.id).toEqual(classicBeer(c))
    }
  })

  it('have their English texts in beers.en.json', () => {
    const texts = en.beers as Record<string, unknown>
    for (const c of classics) expect(texts[c.id], c.id).toEqual(c.en)
  })

  it('never join the onboarding set', () => {
    for (const c of classics) expect(byId.get(c.id)?.reference, c.id).toBeFalsy()
  })
})
