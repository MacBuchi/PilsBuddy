import { describe, expect, it } from 'vitest'
import { BEERS } from '../../data/beers'
import { COPY, COPY_BY_LANG } from '../../data/copy'
import { current, isOver, isRight, isWin, newQuiz, pick, QUIZ_PASS, QUIZ_QUESTIONS, scoreOf } from './quiz'
import type { QuizGame } from './quiz'

const beers = BEERS.filter((b) => !b.regional)
const answerAll = (game: QuizGame, right: (i: number) => boolean) =>
  game.questions.reduce((g, q, i) => pick(g, right(i) ? q.answer : (q.answer + 1) % q.options.length), game)

describe('newQuiz', () => {
  it('asks ten questions with four distinct options and one right answer', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const game = newQuiz(beers, seed)
      expect(game.questions).toHaveLength(QUIZ_QUESTIONS)
      for (const q of game.questions) {
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.answer).toBeGreaterThanOrEqual(0)
        expect(q.answer).toBeLessThan(4)
        expect(q.explain.length).toBeGreaterThan(10)
      }
      expect(game.questions.filter((q) => q.kind === 'fact')).toHaveLength(5)
    }
  })

  it('is deterministic – the same seed, the same quiz', () => {
    expect(newQuiz(beers, 42)).toEqual(newQuiz(beers, 42))
    expect(newQuiz(beers, 42)).not.toEqual(newQuiz(beers, 43))
  })

  it('builds beer questions that are right by the data', () => {
    const byName = new Map(beers.map((b) => [b.fullName, b]))
    for (let seed = 1; seed <= 40; seed++) {
      for (const q of newQuiz(beers, seed).questions) {
        if (q.kind === 'fact') continue
        const beer = beers.find((b) => b.id === q.beer)!
        const right = q.options[q.answer]
        if (q.kind === 'country') expect(right).toBe(beer.country)
        if (q.kind === 'style') {
          expect(right).toBe(beer.style)
          // no near-twins like „IPA“ next to „Hazy IPA“
          const others = q.options.filter((o) => o !== right)
          for (const o of others) expect(o.toLowerCase().split(/[\s-]+/).some((w) => right.toLowerCase().split(/[\s-]+/).includes(w))).toBe(false)
        }
        if (q.kind === 'abv') {
          expect(right).toBe(beer.fullName)
          for (const o of q.options) if (o !== right) expect(byName.get(o)!.abv).toBeLessThanOrEqual(beer.abv - 0.5)
        }
      }
    }
  })

  it('never asks about the same beer twice in one game', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const ids = newQuiz(beers, seed).questions.flatMap((q) => (q.beer ? [q.beer] : []))
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('throws without enough beers', () => {
    expect(() => newQuiz(beers.slice(0, 3), 1)).toThrow()
  })
})

describe('playing', () => {
  it('counts right answers; seven or more wins', () => {
    const game = newQuiz(beers, 7)
    expect(current(game)).toBe(game.questions[0])
    const all = answerAll(game, () => true)
    expect(isOver(all)).toBe(true)
    expect(scoreOf(all)).toBe(QUIZ_QUESTIONS)
    expect(isWin(all)).toBe(true)
    const six = answerAll(game, (i) => i < QUIZ_PASS - 1)
    expect(scoreOf(six)).toBe(QUIZ_PASS - 1)
    expect(isWin(six)).toBe(false)
    expect(isRight(six, 0)).toBe(true)
    expect(isRight(six, 9)).toBe(false)
  })

  it('ignores invalid picks and picks after the end', () => {
    const game = newQuiz(beers, 3)
    expect(pick(game, 4)).toBe(game)
    expect(pick(game, -1)).toBe(game)
    expect(pick(game, 1.5)).toBe(game)
    const done = answerAll(game, () => true)
    expect(pick(done, 0)).toBe(done)
    expect(current(done)).toBeUndefined()
  })
})

describe('fact bank', () => {
  it('has the same questions in German and English, four options each', () => {
    const de = COPY_BY_LANG.de.quiz.facts
    const en = COPY_BY_LANG.en.quiz.facts
    expect(de.length).toBeGreaterThanOrEqual(20)
    expect(en).toHaveLength(de.length)
    for (const f of [...de, ...en]) {
      expect(f.options).toHaveLength(4)
      expect(new Set(f.options).size).toBe(4)
    }
    // spot check: the pairs stay aligned
    expect(de[0].options[0]).toBe(en[0].options[0])
    expect(COPY.quiz.facts).toBe(de)
  })
})
