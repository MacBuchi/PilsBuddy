import { describe, expect, it } from 'vitest'
import { BEERS } from '../../data/beers'
import { parseGame } from './party'
import {
  currentRound,
  customBeer,
  MAX_TASTING_BEERS,
  mostDisputed,
  newTasting,
  parseTasting,
  ratingFor,
  summarize,
  tastingBeer,
  tastingEnd,
  tastingPour,
  tastingRanking,
  tastingRate,
  tastingReveal,
  tastingSettle,
  TASTING_AXES,
} from './tasting'
import type { Tasting, TastingVerdict } from './tasting'

const beer = tastingBeer(BEERS[0])
const other = tastingBeer(BEERS[1])
const v = (stars: number, bitterness = 50, body = 50, sweetness = 50): TastingVerdict => ({ stars, axes: { bitterness, body, sweetness } })
const poured = () => tastingPour(newTasting(), beer)

describe('Tasting-Abend', () => {
  it('a catalog beer carries its profile for the judged axes; a typed one has none', () => {
    expect(beer).toMatchObject({ id: BEERS[0].id, name: BEERS[0].name, brewery: BEERS[0].brewery, estimate: false })
    for (const a of TASTING_AXES) expect(beer.taste?.[a]).toBe(BEERS[0].taste[a])
    expect(customBeer('  Omas Kellerbier \n')).toEqual({ id: '', name: 'Omas Kellerbier', brewery: '', style: '', taste: null, estimate: false })
    expect(customBeer('   ')).toBe(null)
    expect(customBeer('x'.repeat(200))?.name).toHaveLength(60)
  })

  it('a regional beer’s profile is marked as a style estimate', () => {
    const regional = { ...BEERS[0], regional: { breweryId: 'b1', source: 'Open Food Facts' } }
    expect(tastingBeer(regional).estimate).toBe(true)
  })

  it('pours only at the start or after a reveal', () => {
    const t = poured()
    expect(currentRound(t)?.beer).toBe(beer)
    expect(tastingPour(t, other)).toBe(t) // still being rated
    const r = tastingReveal(tastingRate(t, 'h', v(4)))
    const n = tastingPour(r, other)
    expect(n.rounds.map((x) => x.beer.id)).toEqual([beer.id, other.id])
    expect(currentRound(n)?.revealed).toBe(false)
  })

  it('stops pouring after MAX_TASTING_BEERS', () => {
    let t = newTasting()
    for (let i = 0; i < MAX_TASTING_BEERS + 3; i++) t = tastingReveal(tastingRate(tastingPour(t, beer), 'h', v(3)))
    expect(t.rounds).toHaveLength(MAX_TASTING_BEERS)
  })

  it('one verdict per player and beer, clamped, only before the reveal', () => {
    const t = tastingRate(poured(), 'a', v(9, -5, 140.4, 33.6))
    expect(currentRound(t)?.verdicts.a).toEqual(v(5, 0, 100, 34))
    expect(tastingRate(t, 'a', v(1))).toBe(t)
    expect(tastingRate(newTasting(), 'a', v(3))).toEqual(newTasting()) // nothing poured yet
    const r = tastingReveal(t)
    expect(tastingRate(r, 'b', v(2))).toBe(r)
  })

  it('reveals by itself once everyone at the table has rated, and needs a verdict to reveal', () => {
    const t = poured()
    expect(tastingReveal(t)).toBe(t)
    const one = tastingRate(t, 'h', v(4))
    expect(tastingSettle(one, ['h', 'a'])).toBe(one)
    const both = tastingRate(one, 'a', v(2))
    expect(currentRound(tastingSettle(both, ['h', 'a']))?.revealed).toBe(true)
    expect(tastingSettle(both, [])).toBe(both)
  })

  it('sums up the table: average stars, axes, the spread', () => {
    const t = tastingRate(tastingRate(tastingRate(poured(), 'h', v(5, 80, 40, 10)), 'a', v(2, 60, 50, 20)), 'b', v(4, 70, 60, 30))
    expect(summarize(currentRound(t)!)).toEqual({
      stars: 3.7,
      axes: { bitterness: 70, body: 50, sweetness: 20 },
      low: 2,
      high: 5,
      count: 3,
      split: true,
    })
    expect(summarize(currentRound(poured())!)).toBe(null)
    expect(summarize(currentRound(tastingRate(poured(), 'h', v(3)))!)?.split).toBe(false)
  })

  it('ranks the evening’s beers, sharing places, and finds the most disputed one', () => {
    let t: Tasting = newTasting()
    const round = (b: typeof beer, stars: number[]) => {
      t = tastingPour(t, b)
      stars.forEach((s, i) => (t = tastingRate(t, `p${i}`, v(s))))
      t = tastingReveal(t)
    }
    round(beer, [3, 3])
    round(other, [5, 1])
    round(customBeer('Hausbier')!, [4, 4])
    round(customBeer('Nochwas')!, [3, 3])
    const ranking = tastingRanking(t)
    expect(ranking.map((e) => [e.beer.name, e.place])).toEqual([
      ['Hausbier', 1],
      [beer.name, 2],
      [other.name, 2],
      ['Nochwas', 2],
    ])
    expect(mostDisputed(t)).toBe(1)
    expect(mostDisputed(tastingReveal(tastingRate(poured(), 'h', v(3))))).toBe(null)
  })

  it('ends after a reveal; an open beer is dropped, an evening without a rated beer cannot end', () => {
    const t = poured()
    expect(tastingEnd(newTasting())).toEqual(newTasting())
    expect(tastingEnd(t)).toBe(t)
    const r = tastingReveal(tastingRate(t, 'h', v(4)))
    expect(tastingEnd(r)).toMatchObject({ over: true, rounds: r.rounds })
    const open = tastingPour(r, other)
    const e = tastingEnd(open)
    expect(e.over).toBe(true)
    expect(e.rounds).toHaveLength(1)
    expect(tastingPour(e, other)).toBe(e)
    expect(tastingRate(e, 'a', v(3))).toBe(e)
  })

  it('maps stars to the own ratings only where they say something', () => {
    expect([1, 2, 3, 4, 5].map(ratingFor)).toEqual(['DISLIKE', 'DISLIKE', null, 'LIKE', 'LIKE'])
  })

  it('reads its own snapshot back and refuses anything off', () => {
    const t = tastingPour(tastingReveal(tastingRate(poured(), 'h', v(4, 10, 20, 30))), customBeer('Hausbier')!)
    const wire = JSON.parse(JSON.stringify(t))
    expect(parseGame(wire)).toEqual(t)
    expect(parseGame({ ...wire, over: true })).toBe(null) // last beer still open
    const bad = (f: (w: typeof wire) => void) => {
      const w = JSON.parse(JSON.stringify(t))
      f(w)
      return parseTasting(w)
    }
    expect(bad((w) => (w.rounds[0].verdicts.h.stars = 6))).toBe(null)
    expect(bad((w) => (w.rounds[0].verdicts.h.axes.body = 101))).toBe(null)
    expect(bad((w) => (w.rounds[0].revealed = false))).toBe(null) // only the last one can be open
    expect(bad((w) => (w.rounds[1].beer.name = ' '))).toBe(null)
    expect(bad((w) => (w.rounds[0].beer.taste = { bitterness: 1 }))).toBe(null)
    expect(bad((w) => (w.rounds = Array(MAX_TASTING_BEERS + 1).fill(w.rounds[0])))).toBe(null)
    expect(bad((w) => (w.rounds[1].beer.name = 'Bier\u0007mit Klingel'))?.rounds[1].beer.name).toBe('Biermit Klingel')
    expect(parseTasting({ rounds: [], over: true })).toBe(null)
    expect(parseTasting({ rounds: [], over: false })).toEqual(newTasting())
  })
})
