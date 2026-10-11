import { describe, expect, it } from 'vitest'
import { cleanHandle, parseFeed, rankPeople } from './pilsMatch'
import type { Ratings } from './types'

const A = '0b0b0b0b-0000-4000-8000-00000000000a'
const B = '0b0b0b0b-0000-4000-8000-00000000000b'
const C = '0b0b0b0b-0000-4000-8000-00000000000c'

const R = (o: Record<string, Ratings[string]['rating']>): Ratings => Object.fromEntries(Object.entries(o).map(([id, rating]) => [id, { rating, at: 1 }]))

describe('handle', () => {
  it('trims, drops a leading @ and keeps umlauts', () => {
    expect(cleanHandle('  @Bierfan_Jöran ')).toBe('Bierfan_Jöran')
  })
  it('rejects too short, too long and odd characters', () => {
    expect(cleanHandle('x')).toBeNull()
    expect(cleanHandle('a'.repeat(25))).toBeNull()
    expect(cleanHandle('Bier Fan')).toBeNull()
    expect(cleanHandle('<script>')).toBeNull()
  })
})

describe('parseFeed', () => {
  it('reads people and their ratings, drops unknown beers and broken rows', () => {
    const feed = parseFeed({
      me: { visible: true, handle: 'Ich' },
      people: [
        { id: A, handle: 'Hopfen', ratings: { L: ['jever', 'gibts-nicht'], D: ['becks'], U: ['corona'] }, mine: true, mutual: true },
        { id: 'nope', handle: 'Kaputt', ratings: {} },
        { id: B, handle: 'x', ratings: {} },
        { id: C, handle: 'Malz', mutual: true },
      ],
    })!
    expect(feed.visible).toBe(true)
    expect(feed.people.map((p) => p.handle)).toEqual(['Hopfen', 'Malz'])
    expect(feed.people[0].ratings).toEqual({ jever: { rating: 'LIKE', at: 0 }, becks: { rating: 'DISLIKE', at: 0 } })
    // „mutual“ without an own clink is impossible – never trust it
    expect(feed.people[1]).toMatchObject({ mine: false, mutual: false })
  })

  it('is not visible without a valid handle and null for garbage', () => {
    expect(parseFeed({ me: { visible: true, handle: null }, people: [] })!.visible).toBe(false)
    expect(parseFeed({ error: 'auth' })).toBeNull()
    expect(parseFeed(null)).toBeNull()
  })
})

describe('rankPeople', () => {
  const me = R({ jever: 'LIKE', 'paulaner-weisse': 'DISLIKE' })
  const twin = { id: A, handle: 'Zwilling', ratings: R({ jever: 'LIKE', 'paulaner-weisse': 'DISLIKE' }), mine: false, mutual: false }
  const other = { id: B, handle: 'Gegenteil', ratings: R({ jever: 'DISLIKE', 'paulaner-weisse': 'LIKE' }), mine: false, mutual: false }

  it('puts the closest taste first and compares like a buddy link', () => {
    const ranked = rankPeople(me, [other, twin])
    expect(ranked.map((p) => p.handle)).toEqual(['Zwilling', 'Gegenteil'])
    expect(ranked[0].compare.shared).toEqual(['jever'])
    expect(ranked[1].compare.disagree.sort()).toEqual(['jever', 'paulaner-weisse'])
    expect(ranked[0].compare.pct).toBeGreaterThan(ranked[1].compare.pct)
  })

  it('lists buddies first', () => {
    const ranked = rankPeople(me, [twin, { ...other, mine: true, mutual: true }])
    expect(ranked.map((p) => p.handle)).toEqual(['Gegenteil', 'Zwilling'])
  })

  it('is deterministic', () => {
    expect(rankPeople(me, [twin, other])).toEqual(rankPeople(me, [other, twin]))
  })
})
