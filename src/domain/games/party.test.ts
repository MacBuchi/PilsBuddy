import { describe, expect, it } from 'vitest'
import { BEER_BY_ID, BUNDLED_IDS } from '../../data/beers'
import {
  duelPlay,
  fillGuess,
  fillNext,
  fillPoints,
  fillRanking,
  fillReveal,
  fillSettle,
  newDuel,
  newFillParty,
  parseGame,
  roundFor,
  seatOf,
} from './party'
import { botChoice } from './quartett'

const duel = () => newDuel(['h', 'a'], BUNDLED_IDS, 7)

describe('Quartett zu zweit', () => {
  it('deals like the bot game – same seed, same cards – and the host starts', () => {
    const d = duel()
    expect(d).toEqual(newDuel(['h', 'a'], BUNDLED_IDS, 7))
    expect(d.q.piles[0]).toHaveLength(10)
    expect(d.q.piles[1]).toHaveLength(10)
    expect(d.q.turn).toBe(0)
    expect(seatOf(d, 'h')).toBe(0)
    expect(seatOf(d, 'a')).toBe(1)
    expect(seatOf(d, 'z')).toBe(null)
  })

  it('only the player whose turn it is names a value', () => {
    const d = duel()
    expect(duelPlay(d, 'a', 'abv', BEER_BY_ID)).toBe(d)
    expect(duelPlay(d, 'z', 'abv', BEER_BY_ID)).toBe(d)
    const n = duelPlay(d, 'h', 'abv', BEER_BY_ID)
    expect(n.q.round).toBe(1)
    expect(n.q.last?.chooser).toBe(0)
    // the winner of the round names the next value; on a tie the same player again
    const next = n.q.last?.outcome === 'tie' ? 'h' : n.seats[n.q.last?.outcome as 0 | 1]
    expect(n.seats[n.q.turn]).toBe(next)
  })

  it('refuses cards this device does not know', () => {
    const d = newDuel(['h', 'a'], ['nope-1', 'nope-2'], 1)
    expect(duelPlay(d, 'h', 'abv', BEER_BY_ID)).toBe(d)
  })

  it('plays to the end and stops there', () => {
    let d = duel()
    for (let i = 0; i < 40 && d.q.winner === null; i++) {
      const id = d.seats[d.q.turn]
      d = duelPlay(d, id, botChoice(d.q, BEER_BY_ID, d.q.turn), BEER_BY_ID)
    }
    expect(d.q.winner).not.toBe(null)
    expect(duelPlay(d, d.seats[d.q.turn], 'abv', BEER_BY_ID)).toBe(d)
  })

  it('shows a round from the guest seat with its own card first', () => {
    const d = duelPlay(duel(), 'h', 'bitterness', BEER_BY_ID)
    const r = d.q.last!
    expect(roundFor(r, 0)).toBe(r)
    const g = roundFor(r, 1)
    expect(g.cards).toEqual([r.cards[1], r.cards[0]])
    expect(g.values).toEqual([r.values[1], r.values[0]])
    expect(g.chooser).toBe(1)
    expect(g.outcome).toBe(r.outcome === 'tie' ? 'tie' : r.outcome === 0 ? 1 : 0)
  })
})

describe('Wie viel ist drin? für alle', () => {
  it('pours the same glasses as the solo game for the same seed', () => {
    const f = newFillParty(3)
    expect(f).toEqual(newFillParty(3))
    expect(f.rounds).toHaveLength(5)
    expect(f).toMatchObject({ index: 0, revealed: false, over: false, guesses: {}, points: {} })
  })

  it('takes one guess per player and glass, rounded and capped', () => {
    let f = newFillParty(3)
    f = fillGuess(f, 'a', 123.4)
    expect(f.guesses).toEqual({ a: 123 })
    expect(fillGuess(f, 'a', 200)).toBe(f)
    expect(fillGuess(f, 'b', Number.NaN)).toBe(f)
    expect(fillGuess(f, 'b', -5).guesses.b).toBe(0)
    expect(fillGuess(f, 'b', 1e9).guesses.b).toBeLessThanOrEqual(2000)
  })

  it('reveals once everyone at the table has guessed, then moves on', () => {
    let f = newFillParty(3)
    const truth = f.rounds[0].ml
    f = fillGuess(f, 'h', truth)
    expect(fillSettle(f, ['h', 'a'])).toBe(f)
    f = fillSettle(fillGuess(f, 'a', truth + 1000), ['h', 'a'])
    expect(f.revealed).toBe(true)
    expect(f.points).toEqual({ h: 100, a: 0 })
    expect(fillPoints(f, 'h')).toBe(100)
    expect(fillPoints(f, 'z')).toBe(null)
    expect(fillGuess(f, 'z', 10)).toBe(f) // too late
    f = fillNext(f)
    expect(f).toMatchObject({ index: 1, revealed: false, guesses: {} })
    expect(f.points).toEqual({ h: 100, a: 0 })
  })

  it('the host can resolve without the last guess, but not without any', () => {
    const f = newFillParty(3)
    expect(fillReveal(f)).toBe(f)
    const g = fillReveal(fillGuess(f, 'a', 100))
    expect(g.revealed).toBe(true)
    expect(Object.keys(g.points)).toEqual(['a'])
    expect(fillNext(f)).toBe(f) // not before the reveal
  })

  it('ends after the last glass and ranks with shared places', () => {
    let f = newFillParty(3)
    for (let i = 0; i < f.rounds.length; i++) {
      f = fillGuess(fillGuess(fillGuess(f, 'h', f.rounds[i].ml), 'a', f.rounds[i].ml), 'b', 0)
      f = fillNext(fillSettle(f, ['h', 'a', 'b']))
    }
    expect(f.over).toBe(true)
    expect(fillNext(f)).toBe(f)
    expect(fillRanking(f, ['b', 'a', 'h', 'new'])).toEqual([
      { id: 'a', points: 500, place: 1 },
      { id: 'h', points: 500, place: 1 },
      { id: 'b', points: expect.any(Number), place: 3 },
      { id: 'new', points: 0, place: expect.any(Number) },
    ])
  })
})

describe('games from the network', () => {
  it('round-trips both games through JSON', () => {
    const d = duelPlay(duel(), 'h', 'abv', BEER_BY_ID)
    expect(parseGame(JSON.parse(JSON.stringify(d)))).toEqual(d)
    const f = fillReveal(fillGuess(newFillParty(9), 'a', 120))
    expect(parseGame(JSON.parse(JSON.stringify(f)))).toEqual(f)
  })

  it('rejects malformed games', () => {
    const d = duel()
    const f = newFillParty(9)
    const bad: unknown[] = [
      null,
      { kind: 'poker' },
      { ...d, seats: ['h', 'h'] },
      { ...d, seats: ['h'] },
      { ...d, q: { ...d.q, turn: 2 } },
      { ...d, q: { ...d.q, piles: [d.q.piles[0], [1, 2]] } },
      { ...d, q: { ...d.q, winner: 'bot' } },
      { ...d, q: { ...d.q, last: { stat: 'colour', chooser: 0, cards: ['a', 'b'], values: [1, 2], outcome: 0, won: 2 } } },
      { ...f, rounds: [] },
      { ...f, rounds: [{ glass: 'eimer', ml: 100 }] },
      { ...f, index: 5 },
      { ...f, guesses: { a: -1 } },
      { ...f, points: [1, 2] },
      { ...f, revealed: 'yes' },
    ]
    for (const b of bad) expect(parseGame(b)).toBe(null)
  })
})
