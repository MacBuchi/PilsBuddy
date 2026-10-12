import { newBierionaer, LADDER, tableClose, tableVote, answer as bierAnswer, playJoker, ROOM_JOKERS, walkAway } from './bierionaer'
import type { BierionaerGame, BierionaerStatus, Joker, JokerHelp } from './bierionaer'
import { newQuiz, QUIZ_TOPICS } from './quiz'
import type { QuizBeer, QuizKind, QuizLevel, QuizQuestion } from './quiz'

/**
 * The quiz games of a room (Stufe E8, Wunsch #45): the Bierquiz for everyone at the table and „Wer wird
 * Bierionär?“ with one candidate in the chair, where the others can be asked („Mitspieler fragen“). Only the host
 * runs these rules (see room.ts); guests render the host's snapshot. The host deals the questions from its seed
 * and its language and sends them along – a guest's device need not know the beers or the text bank.
 * Pure and deterministic.
 */

/** Bierquiz for everyone: same question for all, everyone answers, then the reveal. */
export interface QuizParty {
  kind: 'quiz'
  questions: QuizQuestion[]
  /** The question on the table. */
  index: number
  revealed: boolean
  /** Answers to the current question, by player id. */
  answers: Record<string, number>
  /** Right answers so far, by player id. */
  points: Record<string, number>
  over: boolean
}

/** „Wer wird Bierionär?“ at the table: the candidate plays, the rest watch and can be asked. */
export interface BierParty {
  kind: 'bierionaer'
  candidate: string
  game: BierionaerGame
  /** The last answer is on screen for everyone until the candidate (or the host) moves on. */
  shown: boolean
}

export function newQuizParty(beers: readonly QuizBeer[], seed: number): QuizParty {
  return { kind: 'quiz', questions: newQuiz(beers, seed).questions, index: 0, revealed: false, answers: {}, points: {}, over: false }
}

/** One answer per player and question, only before the reveal. */
export function quizAnswer(f: QuizParty, from: string, option: number): QuizParty {
  const q = f.questions[f.index]
  if (f.over || f.revealed || Object.hasOwn(f.answers, from) || !Number.isInteger(option) || option < 0 || option >= q.options.length) return f
  return { ...f, answers: { ...f.answers, [from]: option } }
}

/** Resolves the question: a point for every right answer. Needs at least one answer. */
export function quizReveal(f: QuizParty): QuizParty {
  if (f.over || f.revealed || !Object.keys(f.answers).length) return f
  const right = f.questions[f.index].answer
  const points = { ...f.points }
  for (const [id, a] of Object.entries(f.answers)) points[id] = (points[id] ?? 0) + (a === right ? 1 : 0)
  return { ...f, revealed: true, points }
}

/** Reveals by itself once everyone at the table (`ids`) has answered. */
export function quizSettle(f: QuizParty, ids: readonly string[]): QuizParty {
  return ids.length && ids.every((id) => Object.hasOwn(f.answers, id)) ? quizReveal(f) : f
}

/** After a reveal: the next question, or the result after the last one. */
export function quizNext(f: QuizParty): QuizParty {
  if (f.over || !f.revealed) return f
  if (f.index + 1 >= f.questions.length) return { ...f, over: true }
  return { ...f, index: f.index + 1, revealed: false, answers: {} }
}

/** Everyone at the table, most right answers first; equal scores share a place (1, 1, 3). */
export function quizRanking(f: QuizParty, ids: readonly string[]): { id: string; points: number; place: number }[] {
  const list = ids.map((id) => ({ id, points: f.points[id] ?? 0 })).sort((a, b) => b.points - a.points)
  return list.map((e) => ({ ...e, place: list.findIndex((o) => o.points === e.points) + 1 }))
}

export function newBierParty(beers: readonly QuizBeer[], seed: number, candidate: string): BierParty {
  return { kind: 'bierionaer', candidate, game: newBierionaer(beers, seed), shown: false }
}

/** What the people at the table may do in a Bierionär round. */
export type BierMove =
  | { type: 'joker'; joker: Joker }
  | { type: 'pick'; option: number }
  | { type: 'walk' }
  | { type: 'vote'; option: number }
  /** Close the table vote early (candidate or host). */
  | { type: 'tally' }
  /** Move on after an answer was shown (candidate or host). */
  | { type: 'next' }

/**
 * Applies a move from `from`. Jokers, the answer and walking away are the candidate's; the table votes once the
 * candidate asked it; the host may tally and move on in place of a candidate who is slow. `table` is everyone else
 * in the room – the vote closes by itself when they all voted.
 */
export function bierMove(p: BierParty, from: string, isHost: boolean, move: BierMove, table: readonly string[]): BierParty {
  const g = p.game
  const isCandidate = from === p.candidate
  const voters = table.filter((id) => id !== p.candidate)
  const withGame = (game: BierionaerGame, shown = p.shown): BierParty => (game === g && shown === p.shown ? p : { ...p, game, shown })
  switch (move.type) {
    case 'joker':
      // nobody to ask when the candidate is alone at the table
      if (!isCandidate || p.shown || !ROOM_JOKERS.includes(move.joker) || (move.joker === 'tisch' && !voters.length)) return p
      return withGame(playJoker(g, move.joker))
    case 'pick': {
      if (!isCandidate || p.shown) return p
      const next = bierAnswer(g, move.option)
      return next === g ? p : withGame(next, true)
    }
    case 'walk':
      return isCandidate && !p.shown ? withGame(walkAway(g)) : p
    case 'vote':
      if (isCandidate || p.shown) return p
      return withGame(tableClose(tableVote(g, from, move.option), voters))
    case 'tally':
      return (isCandidate || isHost) && !p.shown ? withGame(tableClose(g)) : p
    case 'next':
      return (isCandidate || isHost) && p.shown ? withGame(g, false) : p
  }
}

/** The table changed: a vote closes once everyone still there has voted. */
export function bierSettle(p: BierParty, table: readonly string[]): BierParty {
  const voters = table.filter((id) => id !== p.candidate)
  const game = tableClose(p.game, voters)
  return game === p.game ? p : { ...p, game }
}

/** The question on stage: during the reveal the one just answered, else the current one (the last when over). */
export function bierQuestion(p: BierParty): { question: QuizQuestion; step: number } {
  const g = p.game
  const step = p.shown && g.status !== 'lost' ? g.step - 1 : Math.min(g.step, g.questions.length - 1)
  return { question: g.questions[step], step }
}

// ---- snapshots from the network -------------------------------------------------------------

const TEXT_MAX = 400
const KINDS = new Set<QuizKind>(['fact', 'country', 'style', 'abv'])
const TOPICS = new Set<string>([...QUIZ_TOPICS, 'beer'])
const STATUSES = new Set<BierionaerStatus>(['playing', 'won', 'lost', 'walked'])
const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0
const isText = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= TEXT_MAX
// eslint-disable-next-line no-control-regex
const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()

function parseQuestion(raw: unknown): QuizQuestion | null {
  const q = raw as Partial<Record<keyof QuizQuestion, unknown>> | null
  if (!q || typeof q !== 'object') return null
  const { kind, topic, level, estimate, prompt, options, answer, beer, explain } = q
  if (!KINDS.has(kind as QuizKind) || typeof topic !== 'string' || !TOPICS.has(topic)) return null
  if ((level !== 1 && level !== 2 && level !== 3) || typeof estimate !== 'boolean' || !isText(prompt) || !isText(explain)) return null
  if (!Array.isArray(options) || options.length < 2 || options.length > 4 || !options.every(isText)) return null
  if (!isCount(answer) || answer >= options.length || (beer !== undefined && typeof beer !== 'string')) return null
  return {
    kind: kind as QuizKind,
    topic: topic as QuizQuestion['topic'],
    level: level as QuizLevel,
    estimate,
    prompt: clean(prompt),
    options: options.map(clean),
    answer,
    ...(typeof beer === 'string' ? { beer: beer.slice(0, 200) } : {}),
    explain: clean(explain),
  }
}

function parseQuestions(raw: unknown, max: number): QuizQuestion[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > max) return null
  const list = raw.map(parseQuestion)
  return list.every((q): q is QuizQuestion => q !== null) ? list : null
}

/** id → option index (or count), checked; null if anything is off. */
function parseIndexMap(raw: unknown, below = Infinity): Record<string, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!isCount(v) || v >= below) return null
    out[k] = v
  }
  return out
}

export function parseQuizParty(raw: Record<string, unknown>): QuizParty | null {
  const { index, revealed, over } = raw
  const questions = parseQuestions(raw.questions, 20)
  if (!questions || !isCount(index) || index >= questions.length || typeof revealed !== 'boolean' || typeof over !== 'boolean') return null
  const answers = parseIndexMap(raw.answers, questions[index].options.length)
  const points = parseIndexMap(raw.points, questions.length + 1)
  return answers && points ? { kind: 'quiz', questions, index, revealed, answers, points, over } : null
}

function parseHelp(raw: unknown, options: number): JokerHelp | null {
  const h = raw as Partial<Record<keyof JokerHelp, unknown>> | null
  if (!h || typeof h !== 'object') return null
  const out: JokerHelp = {}
  const isOption = (n: unknown): n is number => isCount(n) && n < options
  if (h.removed !== undefined) {
    if (!Array.isArray(h.removed) || h.removed.length > options - 1 || !h.removed.every(isOption)) return null
    out.removed = h.removed
  }
  if (h.poll !== undefined) {
    if (!Array.isArray(h.poll) || h.poll.length !== options || !h.poll.every((n) => isCount(n) && n <= 100)) return null
    out.poll = h.poll
  }
  if (h.tip !== undefined) {
    const t = h.tip as { option?: unknown; sure?: unknown } | null
    if (!t || !isOption(t.option) || typeof t.sure !== 'boolean') return null
    out.tip = { option: t.option, sure: t.sure }
  }
  if (h.table !== undefined) {
    const t = h.table as { votes?: unknown; closed?: unknown } | null
    const votes = t ? parseIndexMap(t.votes, options) : null
    if (!t || !votes || typeof t.closed !== 'boolean') return null
    out.table = { votes, closed: t.closed }
  }
  return out
}

export function parseBierParty(raw: Record<string, unknown>): BierParty | null {
  const { candidate, shown } = raw
  const g = raw.game as Partial<Record<keyof BierionaerGame, unknown>> | null
  if (typeof candidate !== 'string' || !candidate || typeof shown !== 'boolean' || !g || typeof g !== 'object') return null
  const questions = parseQuestions(g.questions, LADDER.length)
  const { seed, step, status, last } = g
  if (!questions || questions.length !== LADDER.length || typeof seed !== 'number' || !Number.isInteger(seed) || !isCount(step) || step > questions.length) return null
  if (!STATUSES.has(status as BierionaerStatus) || (last !== undefined && !isCount(last))) return null
  const used = g.used as Record<string, unknown> | null
  if (!used || typeof used !== 'object' || Array.isArray(used)) return null
  const spent: Partial<Record<Joker, number>> = {}
  for (const [k, v] of Object.entries(used)) {
    if (!ROOM_JOKERS.includes(k as Joker) || !isCount(v)) return null
    spent[k as Joker] = v
  }
  const help = parseHelp(g.help, questions[Math.min(step, questions.length - 1)].options.length)
  if (!help) return null
  const game: BierionaerGame = { seed, questions, step, used: spent, help, status: status as BierionaerStatus, ...(isCount(last) ? { last } : {}) }
  return { kind: 'bierionaer', candidate, game, shown }
}
