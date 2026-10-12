import { describe, expect, it } from 'vitest'
import { BEER_BY_ID, BEERS, BUNDLED_IDS } from '../../data/beers'
import { tableShares } from './bierionaer'
import { parseGame } from './party'
import { bierMove, bierQuestion, newBierParty, newQuizParty, quizAnswer, quizNext, quizRanking, quizReveal, quizSettle } from './quizparty'
import type { BierParty, QuizParty } from './quizparty'
import { applyIntent, openRoom, parseIntent, withPresent } from './room'
import type { RoomMember, RoomState } from './room'

const beers = BEERS.filter((b) => !b.regional)
const host: RoomMember = { id: 'h', name: 'Buddy #0427' }
const anna: RoomMember = { id: 'a', name: 'Buddy #1200' }
const ben: RoomMember = { id: 'b', name: 'Buddy #3301' }
const ids = ['h', 'a', 'b']
const deck = { ids: BUNDLED_IDS, lookup: BEER_BY_ID }

const ready = (): RoomState => {
  let s = withPresent(openRoom('K7Q2M', host), [host, anna, ben])
  for (const id of ['a', 'b']) s = applyIntent(s, id, { type: 'ready', ready: true })
  return s
}
const right = (f: QuizParty) => f.questions[f.index].answer
const wrong = (f: QuizParty) => (right(f) + 1) % f.questions[f.index].options.length

describe('Bierquiz at the table', () => {
  it('everyone answers the same question; it resolves once all have answered', () => {
    let f = newQuizParty(beers, 7)
    expect(f.questions).toHaveLength(10)
    f = quizSettle(quizAnswer(f, 'h', right(f)), ids)
    expect(f.revealed).toBe(false)
    f = quizAnswer(f, 'h', wrong(f))
    expect(f.answers.h).toBe(right(f))
    f = quizSettle(quizAnswer(quizAnswer(f, 'a', wrong(f)), 'b', right(f)), ids)
    expect(f.revealed).toBe(true)
    expect(f.points).toEqual({ h: 1, a: 0, b: 1 })
    expect(quizAnswer(f, 'a', right(f))).toBe(f)
  })

  it('the host can call it, then move on; the last question ends the quiz with a ranking', () => {
    let f = newQuizParty(beers, 8)
    expect(quizReveal(f)).toBe(f)
    for (let i = 0; i < f.questions.length; i++) {
      f = quizReveal(quizAnswer(quizAnswer(f, 'h', right(f)), 'a', i < 3 ? right(f) : wrong(f)))
      f = quizNext(f)
    }
    expect(f.over).toBe(true)
    expect(quizRanking(f, ids)).toEqual([
      { id: 'h', points: 10, place: 1 },
      { id: 'a', points: 3, place: 2 },
      { id: 'b', points: 0, place: 3 },
    ])
  })

  it('runs in the room: start, answers, auto-reveal, next', () => {
    let s = applyIntent(ready(), 'h', { type: 'start', game: 'quiz', seed: 5 }, deck)
    expect(s.game?.kind).toBe('quiz')
    const f = () => s.game as QuizParty
    for (const id of ids) s = applyIntent(s, id, { type: 'answer', option: right(f()) }, deck)
    expect(f().revealed).toBe(true)
    expect(applyIntent(s, 'a', { type: 'next' })).toBe(s)
    s = applyIntent(s, 'h', { type: 'next' })
    expect(f().index).toBe(1)
    // someone leaving resolves the question for the rest
    s = applyIntent(applyIntent(s, 'h', { type: 'answer', option: 0 }), 'a', { type: 'answer', option: 0 })
    s = withPresent(s, [host, anna])
    expect(f().revealed).toBe(true)
  })
})

describe('Bierionär at the table', () => {
  const start = (candidate?: string) => applyIntent(ready(), 'h', { type: 'start', game: 'bierionaer', seed: 11, candidate }, deck)
  const party = (s: RoomState) => s.game as BierParty
  const bier = (s: RoomState, from: string, move: Parameters<typeof bierMove>[3]) => applyIntent(s, from, { type: 'bier', move }, deck)
  const answerOf = (s: RoomState) => bierQuestion(party(s)).question.answer

  it('puts the chosen candidate in the chair (default the host); only they answer', () => {
    expect(party(start()).candidate).toBe('h')
    let s = start('a')
    expect(party(s).candidate).toBe('a')
    expect(party(start('nobody')).candidate).toBe('h')
    expect(bier(s, 'h', { type: 'pick', option: answerOf(s) })).toBe(s)
    s = bier(s, 'a', { type: 'pick', option: answerOf(s) })
    expect(party(s).shown).toBe(true)
    expect(party(s).game.step).toBe(1)
    expect(bierQuestion(party(s)).step).toBe(0)
    // nothing moves while the answer is on screen; then the candidate (or the host) goes on
    expect(bier(s, 'a', { type: 'pick', option: 0 })).toBe(s)
    s = bier(s, 'h', { type: 'next' })
    expect(party(s).shown).toBe(false)
    expect(bierQuestion(party(s)).step).toBe(1)
  })

  it('„Mitspieler fragen“: the others vote, the vote closes once all voted', () => {
    let s = start('a')
    expect(bier(s, 'h', { type: 'joker', joker: 'tisch' })).toBe(s)
    s = bier(s, 'a', { type: 'joker', joker: 'tisch' })
    expect(party(s).game.help.table).toEqual({ votes: {}, closed: false })
    expect(bier(s, 'a', { type: 'vote', option: 0 })).toBe(s)
    s = bier(s, 'h', { type: 'vote', option: answerOf(s) })
    expect(party(s).game.help.table?.closed).toBe(false)
    s = bier(s, 'b', { type: 'vote', option: (answerOf(s) + 1) % 4 })
    expect(party(s).game.help.table?.closed).toBe(true)
    const shares = tableShares(party(s).game)
    expect(shares[answerOf(s)]).toBe(50)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100)
    // once per game
    s = bier(bier(s, 'a', { type: 'pick', option: answerOf(s) }), 'a', { type: 'next' })
    expect(bier(s, 'a', { type: 'joker', joker: 'tisch' })).toBe(s)
  })

  it('the candidate or host can tally early; a leaver closes the vote; the candidate leaving ends the game', () => {
    let s = bier(start('a'), 'a', { type: 'joker', joker: 'tisch' })
    expect(bier(s, 'a', { type: 'tally' })).toBe(s)
    s = bier(s, 'b', { type: 'vote', option: 1 })
    s = withPresent(s, [host, anna, ben])
    expect(party(s).game.help.table?.closed).toBe(false)
    s = bier(s, 'a', { type: 'tally' })
    expect(party(s).game.help.table?.closed).toBe(true)

    let t = bier(start('a'), 'a', { type: 'joker', joker: 'tisch' })
    t = bier(t, 'h', { type: 'vote', option: 2 })
    t = withPresent(t, [host, anna])
    expect(party(t).game.help.table?.closed).toBe(true)
    expect(withPresent(t, [host, ben]).phase).toBe('lobby')
  })

  it('walking away ends the round with the rungs climbed', () => {
    let s = start()
    s = bier(bier(s, 'h', { type: 'pick', option: answerOf(s) }), 'h', { type: 'next' })
    s = bier(s, 'h', { type: 'walk' })
    expect(party(s).game.status).toBe('walked')
  })
})

describe('snapshots', () => {
  it('a game survives the trip over the network, a tampered one does not', () => {
    const q = newQuizParty(beers, 3)
    const b = newBierParty(beers, -12345, 'a')
    expect(parseGame(JSON.parse(JSON.stringify(q)))).toEqual(q)
    expect(parseGame(JSON.parse(JSON.stringify(b)))).toEqual(b)
    expect(parseGame({ ...q, index: 10 })).toBeNull()
    expect(parseGame({ ...q, answers: { a: 4 } })).toBeNull()
    expect(parseGame({ ...q, questions: [{ ...q.questions[0], answer: 7 }] })).toBeNull()
    expect(parseGame({ ...b, game: { ...b.game, used: { cheat: 0 } } })).toBeNull()
    expect(parseGame({ ...b, game: { ...b.game, questions: b.game.questions.slice(1) } })).toBeNull()
    expect(parseGame({ ...b, game: { ...b.game, help: { table: { votes: { h: 9 }, closed: false } } } })).toBeNull()
  })

  it('intents from guests are checked', () => {
    expect(parseIntent({ type: 'answer', option: 2 })).toEqual({ type: 'answer', option: 2 })
    expect(parseIntent({ type: 'answer', option: 4 })).toBeNull()
    expect(parseIntent({ type: 'bier', move: { type: 'joker', joker: 'tisch' } })).toEqual({ type: 'bier', move: { type: 'joker', joker: 'tisch' } })
    expect(parseIntent({ type: 'bier', move: { type: 'joker', joker: 'telefon' } })).toBeNull()
    expect(parseIntent({ type: 'bier', move: { type: 'vote', option: -1 } })).toBeNull()
    expect(parseIntent({ type: 'bier', move: { type: 'next' } })).toEqual({ type: 'bier', move: { type: 'next' } })
  })
})
