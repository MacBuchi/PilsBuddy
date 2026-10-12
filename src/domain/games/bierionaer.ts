import { seededRandom, shuffle } from './quartett'
import { beerQuestion, factQuestion, FACTS } from './quiz'
import type { BeerKind, QuizBeer, QuizFact, QuizLevel, QuizQuestion } from './quiz'

/**
 * „Wer wird Bierionär?“ (Stufe E9): fifteen questions up a ladder of Kronkorken, easy to hard, as in the TV show.
 * Two safety rungs (after question 5 and 10), three jokers once per game – 50:50, the Stammtisch (audience poll) and
 * the Braumeister (phone-a-friend) – and walking away with what is won. The questions come from the Bierquiz bank
 * (four options only) plus three from the beer data. Pure and deterministic – the seed fixes the questions and
 * every joker's answer, and the state is plain data.
 */

/** Kronkorken per rung, as in the German show. */
export const LADDER = [50, 100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 500000, 1000000] as const
/** Rungs (1-based) that are kept even after a wrong answer. */
export const SAFE_RUNGS = [5, 10] as const
const PER_LEVEL = 5
/** Beer-data questions and the level they are asked on. */
const BEER_SLOTS: readonly [BeerKind, QuizLevel][] = [
  ['country', 1],
  ['style', 2],
  ['abv', 3],
]

/** `tisch` – „Mitspieler fragen“ (Stufe E8): only in the game room, where the others at the table vote. */
export type Joker = 'fifty' | 'stammtisch' | 'braumeister' | 'tisch'
/** The jokers of a game on one phone. */
export const JOKERS: readonly Joker[] = ['fifty', 'stammtisch', 'braumeister']
/** In the game room the table can be asked as well. */
export const ROOM_JOKERS: readonly Joker[] = [...JOKERS, 'tisch']

export interface JokerHelp {
  /** 50:50 – the two wrong options taken away. */
  removed?: number[]
  /** Stammtisch – votes per option in percent (sum 100). */
  poll?: number[]
  /** Braumeister – the option he names and whether he sounds sure. */
  tip?: { option: number; sure: boolean }
  /** Mitspieler fragen – the votes by player id; `closed` once everyone voted or the vote was called. */
  table?: { votes: Record<string, number>; closed: boolean }
}

export type BierionaerStatus = 'playing' | 'won' | 'lost' | 'walked'

export interface BierionaerGame {
  seed: number
  questions: QuizQuestion[]
  /** Index of the question being asked (= rungs already climbed). */
  step: number
  /** Jokers spent, with the question index they were used on. */
  used: Partial<Record<Joker, number>>
  /** Help shown for the current question. */
  help: JokerHelp
  status: BierionaerStatus
  /** The option picked on the last question (for the reveal). */
  last?: number
}

/** The four-option facts of one level in seeded order. */
const factsOf = (facts: readonly QuizFact[], level: QuizLevel, rnd: () => number) =>
  shuffle(
    facts.filter((f) => f.level === level && f.options.length === 4),
    Math.floor(rnd() * 2 ** 32),
  )

/** A new game. Throws if the bank or the beers cannot fill the ladder. */
export function newBierionaer(beers: readonly QuizBeer[], seed: number, facts: readonly QuizFact[] = FACTS): BierionaerGame {
  const rnd = seededRandom(seed)
  const used = new Set<string>()
  const questions: QuizQuestion[] = []
  for (const level of [1, 2, 3] as const) {
    const fromBeers = BEER_SLOTS.filter(([, l]) => l === level).map(([kind]) => beerQuestion(kind, beers, used, rnd))
    if (fromBeers.some((q) => !q)) throw new Error('bierionaer: not enough beers')
    for (const q of fromBeers as QuizQuestion[]) q.level = level
    const fromFacts = factsOf(facts, level, rnd)
      .slice(0, PER_LEVEL - fromBeers.length)
      .map((f) => factQuestion(f, rnd))
    if (fromFacts.length + fromBeers.length < PER_LEVEL) throw new Error(`bierionaer: not enough level-${level} questions`)
    questions.push(...shuffle([...fromFacts, ...(fromBeers as QuizQuestion[])], Math.floor(rnd() * 2 ** 32)))
  }
  return { seed, questions, step: 0, used: {}, help: {}, status: 'playing' }
}

export const currentQuestion = (game: BierionaerGame): QuizQuestion | undefined =>
  game.status === 'playing' ? game.questions[game.step] : undefined

/** Kronkorken held after climbing `rungs` rungs. */
export const prizeAt = (rungs: number): number => (rungs > 0 ? LADDER[Math.min(rungs, LADDER.length) - 1] : 0)

/** Kronkorken kept when an answer is wrong at `step`: the last safety rung passed. */
export const safePrize = (step: number): number => prizeAt(Math.max(0, ...SAFE_RUNGS.filter((r) => r <= step)))

/** What the game paid out – or what walking away now would pay. */
export function winnings(game: BierionaerGame): number {
  if (game.status === 'won') return LADDER[LADDER.length - 1]
  if (game.status === 'lost') return safePrize(game.step)
  return prizeAt(game.step)
}

/** A random source for one joker on one question – the same game always gets the same help. */
const helpRandom = (game: BierionaerGame, joker: Joker) =>
  seededRandom((game.seed ^ Math.imul(game.step + 1, 0x9e3779b1) ^ (JOKERS.indexOf(joker) + 1) * 0x85ebca6b) >>> 0)

/** Visible options: 50:50 hides two. */
export const visibleOptions = (game: BierionaerGame): number[] => {
  const q = currentQuestion(game)
  if (!q) return []
  return q.options.map((_, i) => i).filter((i) => !game.help.removed?.includes(i))
}

/** How often the Stammtisch picks the right one, by level. */
const POLL_RIGHT: Record<QuizLevel, [number, number]> = { 1: [55, 80], 2: [40, 62], 3: [26, 46] }
/** How likely the Braumeister knows it, by level. */
const BREWER_KNOWS: Record<QuizLevel, number> = { 1: 0.95, 2: 0.8, 3: 0.6 }

/** Uses a joker on the current question; a spent joker or a finished game changes nothing. */
export function playJoker(game: BierionaerGame, joker: Joker): BierionaerGame {
  const q = currentQuestion(game)
  if (!q || game.used[joker] !== undefined) return game
  if (joker === 'tisch') return { ...game, used: { ...game.used, tisch: game.step }, help: { ...game.help, table: { votes: {}, closed: false } } }
  const rnd = helpRandom(game, joker)
  const open = visibleOptions(game)
  const wrong = open.filter((i) => i !== q.answer)
  const used = { ...game.used, [joker]: game.step }

  if (joker === 'fifty') {
    // keep one wrong option, take the others away
    const keep = wrong[Math.floor(rnd() * wrong.length)]
    return { ...game, used, help: { ...game.help, removed: wrong.filter((i) => i !== keep) } }
  }

  if (joker === 'stammtisch') {
    const [lo, hi] = POLL_RIGHT[q.level]
    let right = lo + Math.floor(rnd() * (hi - lo + 1))
    // the table splits the rest; on hard questions one wrong answer can come out on top
    const weights = wrong.map(() => 0.2 + rnd())
    if (q.level === 3 && wrong.length && rnd() < 0.25) weights[Math.floor(rnd() * wrong.length)] += 3
    const total = weights.reduce((a, b) => a + b, 0)
    const rest = 100 - right
    const shares = weights.map((w) => Math.floor((rest * w) / total))
    right += rest - shares.reduce((a, b) => a + b, 0)
    const poll = q.options.map(() => 0)
    poll[q.answer] = right
    wrong.forEach((i, k) => (poll[i] = shares[k]))
    return { ...game, used, help: { ...game.help, poll } }
  }

  const knows = rnd() < BREWER_KNOWS[q.level]
  const option = knows ? q.answer : wrong[Math.floor(rnd() * wrong.length)]
  // he sounds sure when he knows – mostly; a bluff now and then on hard questions
  const sure = knows ? rnd() < 0.85 : q.level === 3 && rnd() < 0.3
  return { ...game, used, help: { ...game.help, tip: { option, sure } } }
}

/** A vote of someone at the table while „Mitspieler fragen“ is open – once each, only for an option still shown. */
export function tableVote(game: BierionaerGame, from: string, option: number): BierionaerGame {
  const table = game.help.table
  if (!table || table.closed || Object.hasOwn(table.votes, from) || !visibleOptions(game).includes(option)) return game
  return { ...game, help: { ...game.help, table: { ...table, votes: { ...table.votes, [from]: option } } } }
}

/** Closes the vote – by itself once everyone in `voters` has voted, or when called (`voters` omitted). Needs a vote. */
export function tableClose(game: BierionaerGame, voters?: readonly string[]): BierionaerGame {
  const table = game.help.table
  if (!table || table.closed || !Object.keys(table.votes).length) return game
  if (voters && !(voters.length && voters.every((id) => Object.hasOwn(table.votes, id)))) return game
  return { ...game, help: { ...game.help, table: { ...table, closed: true } } }
}

/** Votes per option in percent (rounded, summing to 100), for the bars. */
export function tableShares(game: BierionaerGame): number[] {
  const q = game.questions[game.step]
  const votes = Object.values(game.help.table?.votes ?? {})
  if (!q || !votes.length) return q ? q.options.map(() => 0) : []
  const counts = q.options.map((_, i) => votes.filter((v) => v === i).length)
  const pct = counts.map((c) => Math.floor((c * 100) / votes.length))
  // the remainder goes to the largest counts, so the bars add up to 100
  let rest = 100 - pct.reduce((a, b) => a + b, 0)
  for (const i of [...counts.keys()].sort((a, b) => counts[b] - counts[a] || a - b)) {
    if (!rest) break
    if (counts[i]) {
      pct[i]++
      rest--
    }
  }
  return pct
}

/** Locks in an answer: right climbs a rung (the last one wins), wrong ends the game. */
export function answer(game: BierionaerGame, option: number): BierionaerGame {
  const q = currentQuestion(game)
  if (!q || !visibleOptions(game).includes(option)) return game
  if (option !== q.answer) return { ...game, status: 'lost', last: option, help: {} }
  const step = game.step + 1
  return { ...game, step, last: option, help: {}, status: step === game.questions.length ? 'won' : 'playing' }
}

/** Takes the Kronkorken of the rungs climbed and stops. */
export const walkAway = (game: BierionaerGame): BierionaerGame => (game.status === 'playing' ? { ...game, status: 'walked', help: {} } : game)
