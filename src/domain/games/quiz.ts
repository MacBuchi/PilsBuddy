import { COPY, fill } from '../../data/copy'
import type { Beer } from '../types'
import { seededRandom, shuffle } from './quartett'

/**
 * Bierquiz (Stufe E7, Wunsch #45): ten questions with four answers each. Half are hand-checked knowledge
 * (`COPY.quiz.facts`, the first option is the right one), half are built from the curated beer data: the
 * country of a beer, its style, and which of four beers is the strongest. Pure and deterministic – the same seed
 * asks the same questions in the same order, and the state is plain data so a room host can send it (E8).
 */

export type QuizKind = 'fact' | 'country' | 'style' | 'abv'

export interface QuizQuestion {
  kind: QuizKind
  prompt: string
  options: string[]
  /** Index of the right option. */
  answer: number
  /** Beer the question is about (shows its bottle); `abv` names the strongest one. */
  beer?: string
  /** One line after answering – the fact behind the answer. */
  explain: string
}

export interface QuizGame {
  questions: QuizQuestion[]
  /** Chosen option per answered question, in order. */
  picks: number[]
}

export interface QuizFact {
  q: string
  /** Four options, the first is the right one; the game shuffles them. */
  options: readonly string[]
  explain: string
}

export const QUIZ_QUESTIONS = 10
/** Generated questions per game (the rest are facts), cycling through these kinds. */
const BEER_KINDS: readonly QuizKind[] = ['country', 'style', 'abv', 'country', 'style']
/** A game counts as won with at least this many right answers. */
export const QUIZ_PASS = 7
/** `abv`: the strongest beer must beat the others by this much, so the answer is beyond doubt. */
const ABV_GAP = 0.5

type QuizBeer = Pick<Beer, 'id' | 'name' | 'fullName' | 'brewery' | 'country' | 'region' | 'style' | 'abv'>

const words = (s: string) => s.toLowerCase().split(/[\s-]+/)
/** „IPA“ and „Hazy IPA“, „Weißbier“ and „Alkoholfreies Weißbier“: too close to be fair distractors. */
const related = (a: string, b: string) => words(a).some((w) => words(b).includes(w))

/** Puts `right` among `wrong` at a seeded position. */
function arrange(right: string, wrong: readonly string[], rnd: () => number): { options: string[]; answer: number } {
  const options = shuffle([right, ...wrong], Math.floor(rnd() * 2 ** 32))
  return { options, answer: options.indexOf(right) }
}

/** Three distinct values unlike `right`, drawn in seeded order; null if there are not enough. */
function distractors(right: string, pool: readonly string[], rnd: () => number, unlike = (a: string, b: string) => a === b) {
  const out: string[] = []
  for (const v of shuffle([...new Set(pool)], Math.floor(rnd() * 2 ** 32))) {
    if (out.length === 3) break
    if (!unlike(v, right) && !out.some((o) => unlike(o, v))) out.push(v)
  }
  return out.length === 3 ? out : null
}

function beerQuestion(kind: QuizKind, beers: readonly QuizBeer[], used: Set<string>, rnd: () => number): QuizQuestion | null {
  const T = COPY.quiz.ask
  for (const beer of shuffle(beers, Math.floor(rnd() * 2 ** 32))) {
    if (used.has(beer.id)) continue
    if (kind === 'country') {
      const wrong = distractors(beer.country, beers.map((b) => b.country), rnd)
      if (!wrong) continue
      used.add(beer.id)
      return {
        kind,
        prompt: fill(T.country, { name: beer.fullName }),
        ...arrange(beer.country, wrong, rnd),
        beer: beer.id,
        explain: fill(T.countryExplain, { name: beer.fullName, region: beer.region, country: beer.country }),
      }
    }
    if (kind === 'style') {
      const wrong = distractors(beer.style, beers.map((b) => b.style), rnd, (a, b) => a === b || related(a, b))
      if (!wrong) continue
      used.add(beer.id)
      return {
        kind,
        prompt: fill(T.style, { name: beer.fullName }),
        ...arrange(beer.style, wrong, rnd),
        beer: beer.id,
        explain: fill(T.styleExplain, { name: beer.fullName, brewery: beer.brewery, style: beer.style }),
      }
    }
    if (kind === 'abv') {
      const weaker = shuffle(
        beers.filter((b) => b.id !== beer.id && !used.has(b.id) && b.abv <= beer.abv - ABV_GAP),
        Math.floor(rnd() * 2 ** 32),
      )
      const wrong = distractors(beer.fullName, weaker.map((b) => b.fullName), rnd)
      if (!wrong) continue
      used.add(beer.id)
      return {
        kind,
        prompt: T.abv,
        ...arrange(beer.fullName, wrong, rnd),
        beer: beer.id,
        explain: fill(T.abvExplain, { name: beer.fullName, abv: beer.abv.toFixed(1).replace('.', COPY.app.decimal) }),
      }
    }
  }
  return null
}

/** A new game: facts and beer questions mixed. Throws if the beers cannot fill it. */
export function newQuiz(beers: readonly QuizBeer[], seed: number, facts: readonly QuizFact[] = COPY.quiz.facts): QuizGame {
  const rnd = seededRandom(seed)
  const used = new Set<string>()
  const fromBeers = BEER_KINDS.map((kind) => beerQuestion(kind, beers, used, rnd))
  if (fromBeers.some((q) => !q)) throw new Error('quiz: not enough beers')
  const fromFacts = shuffle(facts, Math.floor(rnd() * 2 ** 32))
    .slice(0, QUIZ_QUESTIONS - fromBeers.length)
    .map((f): QuizQuestion => ({ kind: 'fact', prompt: f.q, ...arrange(f.options[0], f.options.slice(1), rnd), explain: f.explain }))
  const questions = shuffle([...fromFacts, ...(fromBeers as QuizQuestion[])], Math.floor(rnd() * 2 ** 32))
  return { questions, picks: [] }
}

export const current = (game: QuizGame): QuizQuestion | undefined => game.questions[game.picks.length]

/** Answers the current question; out of range or after the end changes nothing. */
export function pick(game: QuizGame, option: number): QuizGame {
  const q = current(game)
  if (!q || !Number.isInteger(option) || option < 0 || option >= q.options.length) return game
  return { ...game, picks: [...game.picks, option] }
}

export const isRight = (game: QuizGame, index: number): boolean => game.picks[index] === game.questions[index]?.answer

export const scoreOf = (game: QuizGame): number => game.picks.filter((_, i) => isRight(game, i)).length

export const isOver = (game: QuizGame): boolean => game.picks.length >= game.questions.length

export const isWin = (game: QuizGame): boolean => isOver(game) && scoreOf(game) >= QUIZ_PASS
