import { describe, expect, it } from 'vitest'
import beers from '../../data/beers.json'
import { flip, isFound, isOver, isPending, isWin, MEMORY_PAIRS, newMemory, parOf, settle } from './memory'
import type { MemoryGame } from './memory'

const PICKS = (beers as { id: string; style: string }[]).map(({ id, style }) => ({ id, style }))

/** Plays perfectly: always turns the two cards of the next unfound pair. */
function solve(game: MemoryGame): MemoryGame {
  let g = game
  for (const pair of new Set(g.cards.map((c) => c.pair))) {
    const [a, b] = g.cards.flatMap((c, i) => (c.pair === pair ? [i] : []))
    g = flip(flip(g, a), b)
  }
  return g
}

/** Index of a card that is not part of the pair at `index`. */
const other = (g: MemoryGame, index: number) => g.cards.findIndex((c) => c.pair !== g.cards[index].pair)

describe('Flaschen-Memory: the table', () => {
  it('lays out 8 pairs, each beer exactly twice', () => {
    for (const variant of ['bottles', 'style'] as const) {
      const g = newMemory(PICKS, variant, 7)
      expect(g.cards).toHaveLength(2 * MEMORY_PAIRS)
      const counts = new Map<string, number>()
      for (const c of g.cards) counts.set(c.pair, (counts.get(c.pair) ?? 0) + 1)
      expect([...counts.values()]).toEqual(Array(MEMORY_PAIRS).fill(2))
      expect(g).toMatchObject({ found: [], open: [], moves: 0, variant })
    }
  })

  it('the same seed lays out the same table, another seed a different one', () => {
    expect(newMemory(PICKS, 'bottles', 42)).toEqual(newMemory(PICKS, 'bottles', 42))
    expect(newMemory(PICKS, 'bottles', 42).cards).not.toEqual(newMemory(PICKS, 'bottles', 43).cards)
  })

  it('bottles: both cards of a pair are bottles', () => {
    expect(newMemory(PICKS, 'bottles', 1).cards.every((c) => c.face === 'bottle')).toBe(true)
  })

  it('style: each pair is one bottle and one style card, and every style appears once', () => {
    for (let seed = 1; seed < 100; seed++) {
      const g = newMemory(PICKS, 'style', seed)
      const style = Object.fromEntries(PICKS.map((p) => [p.id, p.style]))
      const pairs = [...new Set(g.cards.map((c) => c.pair))]
      expect(new Set(pairs.map((id) => style[id])).size).toBe(MEMORY_PAIRS)
      for (const id of pairs) expect(g.cards.filter((c) => c.pair === id).map((c) => c.face).sort()).toEqual(['bottle', 'style'])
    }
  })

  it('refuses a table it cannot fill', () => {
    const lager = PICKS.slice(0, 20).map((p) => ({ ...p, style: 'Lager' }))
    expect(() => newMemory(lager, 'style', 1)).toThrow()
    expect(() => newMemory(PICKS.slice(0, 3), 'bottles', 1)).toThrow()
  })
})

describe('Flaschen-Memory: turning cards', () => {
  const start = newMemory(PICKS, 'bottles', 5)

  it('a pair stays open and counts one move', () => {
    const [a, b] = start.cards.flatMap((c, i) => (c.pair === start.cards[0].pair ? [i] : []))
    const one = flip(start, a)
    expect(one).toMatchObject({ open: [a], moves: 0 })
    const two = flip(one, b)
    expect(two).toMatchObject({ open: [], found: [start.cards[0].pair], moves: 1 })
    expect(isFound(two, a) && isFound(two, b)).toBe(true)
  })

  it('a miss stays up until settled; meanwhile nothing else turns', () => {
    const miss = flip(flip(start, 0), other(start, 0))
    expect(isPending(miss)).toBe(true)
    expect(miss.moves).toBe(1)
    const third = start.cards.findIndex((_, i) => i !== 0 && i !== other(start, 0))
    expect(flip(miss, third)).toBe(miss)
    expect(settle(miss)).toMatchObject({ open: [], found: [], moves: 1 })
    expect(settle(start)).toBe(start)
  })

  it('turning the open card again, a found card or a card off the table changes nothing', () => {
    const one = flip(start, 0)
    expect(flip(one, 0)).toBe(one)
    expect(flip(start, -1)).toBe(start)
    expect(flip(start, start.cards.length)).toBe(start)
    const done = solve(start)
    expect(flip(done, 0)).toBe(done)
  })

  it('perfect play finishes in one move per pair – a win', () => {
    const done = solve(newMemory(PICKS, 'style', 9))
    expect(isOver(done)).toBe(true)
    expect(done.moves).toBe(MEMORY_PAIRS)
    expect(isWin(done)).toBe(true)
  })

  it('more moves than par is no win; not finished is no win', () => {
    let g = start
    for (let i = 0; i < parOf(start); i++) g = settle(flip(flip(g, 0), other(g, 0)))
    expect(isWin(g)).toBe(false)
    expect(isWin(solve(g))).toBe(false)
    expect(solve(g).moves).toBe(parOf(start) + MEMORY_PAIRS)
    expect(isWin(start)).toBe(false)
  })
})
