import { describe, expect, it } from 'vitest'
import { BEER_BY_ID, BEERS } from '../../data/beers'
import type { Beer } from '../types'
import { botChoice, newQuartett, playStat, QUARTETT_STATS, shuffle, statValue } from './quartett'
import type { QuartettState } from './quartett'

const IDS = BEERS.map((b) => b.id)

/** A tiny lookup with chosen values: card `x<n>` has n on every axis and n % alcohol. */
function cardsWith(...values: number[]): Record<string, Beer> {
  const base = BEERS[0]
  return Object.fromEntries(
    values.map((v, i) => [
      `c${i}`,
      {
        ...base,
        id: `c${i}`,
        abv: v,
        taste: Object.fromEntries(Object.keys(base.taste).map((k) => [k, v])) as Beer['taste'],
      },
    ]),
  )
}
const state = (piles: [string[], string[]], extra: Partial<QuartettState> = {}): QuartettState => ({
  piles,
  pot: [],
  turn: 0,
  round: 0,
  maxRounds: 30,
  last: null,
  winner: null,
  ...extra,
})

describe('Bier-Quartett', () => {
  it('deals the same game for the same seed, different ones otherwise', () => {
    expect(newQuartett(IDS, 42)).toEqual(newQuartett(IDS, 42))
    expect(newQuartett(IDS, 42).piles).not.toEqual(newQuartett(IDS, 43).piles)
    const g = newQuartett(IDS, 7, 10)
    expect(g.piles[0]).toHaveLength(10)
    expect(g.piles[1]).toHaveLength(10)
    expect(new Set([...g.piles[0], ...g.piles[1]]).size).toBe(20)
  })

  it('shuffle keeps every card exactly once', () => {
    expect(shuffle(IDS, 1).sort()).toEqual([...IDS].sort())
  })

  it('the higher value takes both cards; the winner puts own card under first and chooses next', () => {
    const lookup = cardsWith(80, 20, 50, 60)
    const next = playStat(
      state([
        ['c0', 'c2'],
        ['c1', 'c3'],
      ]),
      'bitterness',
      lookup,
    )
    expect(next.piles).toEqual([['c2', 'c0', 'c1'], ['c3']])
    expect(next.last).toMatchObject({
      outcome: 0,
      values: [80, 20],
      won: 2,
      chooser: 0,
    })
    expect(next.turn).toBe(0)
    const lost = playStat(next, 'bitterness', lookup) // 50 vs 60
    expect(lost.turn).toBe(1)
    expect(lost.piles[1]).toEqual(['c3', 'c2'])
  })

  it('a tie fills the pot and the same player chooses again; the next winner takes the pot', () => {
    const lookup = cardsWith(50, 50, 90, 10)
    const tied = playStat(
      state(
        [
          ['c0', 'c2'],
          ['c1', 'c3'],
        ],
        { turn: 1 },
      ),
      'body',
      lookup,
    )
    expect(tied.pot).toEqual(['c0', 'c1'])
    expect(tied.turn).toBe(1)
    expect(tied.last?.outcome).toBe('tie')
    expect(tied.winner).toBeNull()
    const after = playStat(tied, 'body', lookup)
    expect(after.piles[0]).toEqual(['c2', 'c3', 'c0', 'c1'])
    expect(after.last?.won).toBe(4)
    expect(after.winner).toBe(0) // the bot has no cards left
  })

  it('ends after maxRounds with the bigger pile winning (or a draw)', () => {
    const lookup = cardsWith(10, 20, 30, 40, 50, 10)
    const s = state(
      [
        ['c4', 'c0', 'c1'],
        ['c2', 'c3'],
      ],
      { round: 29 },
    )
    expect(playStat(s, 'abv', lookup).winner).toBe(0)
    const even = state(
      [
        ['c0', 'c1'],
        ['c5', 'c2'],
      ],
      { round: 29 },
    ) // tie → 1 : 1, pot doesn't count
    expect(playStat(even, 'abv', lookup).winner).toBe('draw')
  })

  it('does nothing once the game is over', () => {
    const over = state([['c0'], []], { winner: 0 })
    expect(playStat(over, 'abv', cardsWith(1))).toBe(over)
  })

  it('every stat reads a number for every beer', () => {
    for (const b of BEERS) for (const { key } of QUARTETT_STATS) expect(Number.isFinite(statValue(b, key))).toBe(true)
  })

  it('the bot names the stat its card is relatively strongest at', () => {
    // Jever: bitterness 95 / dryness 95 – among all beers that beats nearly everything
    const g = state([[...IDS.filter((id) => id !== 'jever')], ['jever']], {
      turn: 1,
    })
    expect(['bitterness', 'dryness']).toContain(botChoice(g, BEER_BY_ID))
    expect(botChoice(g, BEER_BY_ID)).toBe(botChoice(g, BEER_BY_ID))
  })

  it('a whole bot-vs-bot game always ends and never loses a card', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let g = newQuartett(IDS, seed)
      while (g.winner === null) g = playStat(g, botChoice(g, BEER_BY_ID, g.turn), BEER_BY_ID)
      expect(g.piles[0].length + g.piles[1].length + g.pot.length).toBe(20)
      expect(g.round).toBeLessThanOrEqual(30)
    }
  })
})
