import { describe, expect, it } from 'vitest'
import { BEERS } from '../../data/beers'
import { answer, currentQuestion, LADDER, newBierionaer, playJoker, prizeAt, safePrize, visibleOptions, walkAway, winnings } from './bierionaer'
import type { BierionaerGame } from './bierionaer'

const beers = BEERS.filter((b) => !b.regional)
const right = (g: BierionaerGame) => currentQuestion(g)!.answer
const climb = (g: BierionaerGame, n: number) => Array.from({ length: n }).reduce<BierionaerGame>((s) => answer(s, right(s)), g)
const wrongOf = (g: BierionaerGame) => visibleOptions(g).find((i) => i !== right(g))!

describe('newBierionaer', () => {
  it('asks fifteen four-option questions, easy to hard, never the same twice', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = newBierionaer(beers, seed)
      expect(g.questions).toHaveLength(LADDER.length)
      expect(g.questions.map((q) => q.level)).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3])
      for (const q of g.questions) expect(new Set(q.options).size).toBe(4)
      expect(new Set(g.questions.map((q) => q.prompt + q.options.join())).size).toBe(15)
      expect(g.questions.filter((q) => q.topic === 'beer')).toHaveLength(3)
    }
  })

  it('is deterministic', () => {
    expect(newBierionaer(beers, 9)).toEqual(newBierionaer(beers, 9))
  })
})

describe('the ladder', () => {
  it('pays the rung reached; a wrong answer falls back to the last safety rung', () => {
    expect(prizeAt(0)).toBe(0)
    expect(prizeAt(5)).toBe(500)
    expect(safePrize(4)).toBe(0)
    expect(safePrize(5)).toBe(500)
    expect(safePrize(12)).toBe(16000)
    const g = newBierionaer(beers, 3)
    const seven = climb(g, 7)
    expect(winnings(seven)).toBe(2000)
    const lost = answer(seven, wrongOf(seven))
    expect(lost.status).toBe('lost')
    expect(winnings(lost)).toBe(500)
    expect(currentQuestion(lost)).toBeUndefined()
  })

  it('walking away keeps everything climbed; all fifteen make a Bierionär', () => {
    const g = newBierionaer(beers, 4)
    const walked = walkAway(climb(g, 11))
    expect(walked.status).toBe('walked')
    expect(winnings(walked)).toBe(32000)
    const won = climb(g, 15)
    expect(won.status).toBe('won')
    expect(winnings(won)).toBe(1000000)
    expect(answer(won, 0)).toBe(won)
  })
})

describe('jokers', () => {
  it('50:50 takes away two wrong options, never the right one', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = playJoker(newBierionaer(beers, seed), 'fifty')
      expect(g.help.removed).toHaveLength(2)
      expect(g.help.removed).not.toContain(right(g))
      expect(visibleOptions(g)).toHaveLength(2)
      // a hidden option cannot be picked
      expect(answer(g, g.help.removed![0])).toBe(g)
    }
  })

  it('each joker works once per game and the help is gone on the next question', () => {
    const g = playJoker(newBierionaer(beers, 5), 'stammtisch')
    expect(playJoker(g, 'stammtisch')).toBe(g)
    const next = answer(g, right(g))
    expect(next.help).toEqual({})
    expect(playJoker(next, 'stammtisch')).toBe(next)
  })

  it('the Stammtisch votes 100 % in total and is mostly right on easy questions', () => {
    let rightTop = 0
    for (let seed = 1; seed <= 60; seed++) {
      const g = playJoker(newBierionaer(beers, seed), 'stammtisch')
      const poll = g.help.poll!
      expect(poll.reduce((a, b) => a + b, 0)).toBe(100)
      if (poll.indexOf(Math.max(...poll)) === right(g)) rightTop++
    }
    expect(rightTop).toBe(60)
  })

  it('on hard questions the Stammtisch and the Braumeister can be wrong', () => {
    let pollWrong = 0
    let brewerWrong = 0
    for (let seed = 1; seed <= 200; seed++) {
      const g = climb(newBierionaer(beers, seed), 12)
      const poll = playJoker(g, 'stammtisch').help.poll!
      if (poll.indexOf(Math.max(...poll)) !== right(g)) pollWrong++
      if (playJoker(g, 'braumeister').help.tip!.option !== right(g)) brewerWrong++
    }
    expect(pollWrong).toBeGreaterThan(5)
    expect(brewerWrong).toBeGreaterThan(30)
    expect(brewerWrong).toBeLessThan(130)
  })

  it('the Braumeister names a visible option, deterministically', () => {
    const g = playJoker(playJoker(newBierionaer(beers, 8), 'fifty'), 'braumeister')
    expect(visibleOptions(g)).toContain(g.help.tip!.option)
    expect(playJoker(playJoker(newBierionaer(beers, 8), 'fifty'), 'braumeister')).toEqual(g)
  })
})
