import { CheckIcon, HandIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { BEER_BY_ID } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { prizeAt, ROOM_JOKERS, tableShares, visibleOptions, winnings } from '../../domain/games/bierionaer'
import type { Joker } from '../../domain/games/bierionaer'
import { bierQuestion, quizRanking } from '../../domain/games/quizparty'
import type { BierMove, BierParty, QuizParty } from '../../domain/games/quizparty'
import type { RoomIntent, RoomState } from '../../domain/games/room'
import { BeerBottle } from '../components/BeerBottle'
import { Button } from '../components/Button'
import { bierEndTitle, kk, LETTERS, LOCK_MS } from './bierFormat'
import { PollBars, Studio } from './BierStudio'
import bs from './Bierionaer.module.css'
import q from './Quartett.module.css'
import qs from './Quiz.module.css'
import styles from './Room.module.css'

/**
 * The quiz games on the room's table (Stufe E8): the Bierquiz for everyone and „Wer wird Bierionär?“ with one
 * candidate and the table as a joker. The host runs the rules (domain/games/quizparty.ts); this renders and sends wishes.
 */

interface Props<G> {
  room: RoomState
  game: G
  meId: string
  isHost: boolean
  send: (intent: RoomIntent) => void
}

const nameOf = (room: RoomState, id: string) => room.players.find((p) => p.id === id)?.name ?? '?'

function BackToTable({ isHost, send }: { isHost: boolean; send: (intent: RoomIntent) => void }) {
  return isHost ? (
    <Button variant="ink" block onClick={() => send({ type: 'lobby' })}>
      {COPY.room.again}
    </Button>
  ) : (
    <p className={styles.hint}>{COPY.room.waitBack}</p>
  )
}

/** Bierquiz for everyone: one question at a time, everyone answers, then the reveal. */
export function RoomQuiz(props: Props<QuizParty>) {
  const { room, game, meId, isHost, send } = props
  if (game.over) {
    const ranking = quizRanking(
      game,
      room.players.map((p) => p.id),
    )
    const top = ranking.filter((r) => r.place === 1)
    const title =
      top.length > 1 ? COPY.room.quiz.shared : top[0]?.id === meId ? COPY.room.quiz.bestYou : fill(COPY.room.quiz.best, { name: nameOf(room, top[0]?.id ?? '') })
    return (
      <section className={styles.panel} aria-labelledby="quiz-end">
        <span className={styles.label}>{COPY.room.quiz.result}</span>
        <h2 id="quiz-end" className={styles.result}>
          {title}
        </h2>
        <ol className={styles.players}>
          {ranking.map((r) => (
            <li key={r.id} className={styles.player}>
              <span className={styles.who}>
                <span className={styles.place}>{r.place}.</span> {nameOf(room, r.id)}
                {r.id === meId && <span className={styles.tag}>{COPY.room.you}</span>}
              </span>
              <span className={styles.points}>{fill(COPY.room.quiz.points, { p: String(r.points) })}</span>
            </li>
          ))}
        </ol>
        <BackToTable isHost={isHost} send={send} />
      </section>
    )
  }
  return <QuizTurn key={game.index} {...props} />
}

function QuizTurn({ room, game, meId, isHost, send }: Props<QuizParty>) {
  const question = game.questions[game.index]
  const [sent, setSent] = useState<number | null>(null)
  const mine = Object.hasOwn(game.answers, meId) ? game.answers[meId] : sent
  const answered = room.players.filter((p) => Object.hasOwn(game.answers, p.id)).length
  const last = game.index + 1 >= game.questions.length
  const beer = question.beer ? BEER_BY_ID[question.beer] : undefined

  const choose = (option: number) => {
    if (mine !== null || game.revealed) return
    setSent(option)
    send({ type: 'answer', option })
  }

  return (
    <>
      <div className={q.meta}>
        <span>{fill(COPY.quiz.progress, { n: String(game.index + 1), max: String(game.questions.length) })}</span>
        <span>{fill(COPY.quiz.score, { n: String(game.points[meId] ?? 0) })}</span>
      </div>

      <section className={qs.card}>
        <span className={qs.topic}>
          {question.estimate && `${COPY.quiz.estimate} · `}
          {COPY.quiz.topics[question.topic]}
        </span>
        {beer && question.kind !== 'abv' && <BeerBottle beer={beer} size={110} className={qs.bottle} />}
        <h2 className={qs.prompt}>{question.prompt}</h2>
      </section>

      <div className={qs.options} role="group" aria-label={question.prompt}>
        {question.options.map((option, i) => {
          // after answering, the own pick stays and the rest fade; the reveal colours right and wrong
          const state = game.revealed ? (i === question.answer ? qs.right : i === mine ? qs.wrong : qs.dim) : mine !== null && i !== mine ? qs.dim : ''
          return (
            <button
              key={`${game.index}-${i}`}
              type="button"
              className={`${qs.option} ${state}`}
              onClick={() => choose(i)}
              disabled={mine !== null || game.revealed}
              aria-pressed={i === mine}
            >
              <span className={qs.letter} aria-hidden>
                {game.revealed && i === question.answer ? <CheckIcon weight="bold" /> : game.revealed && i === mine ? <XIcon weight="bold" /> : LETTERS[i]}
              </span>
              <span className={qs.optionText}>{option}</span>
            </button>
          )
        })}
      </div>

      <footer className={q.foot}>
        {!game.revealed && (
          <>
            {mine !== null && (
              <p className={q.status} aria-live="polite">
                {COPY.room.quiz.waitOthers}
              </p>
            )}
            <p className={styles.hint}>{fill(COPY.room.quiz.answered, { n: String(answered), max: String(room.players.length) })}</p>
            {isHost && answered > 0 && answered < room.players.length && (
              <Button variant="ghost" block onClick={() => send({ type: 'reveal' })}>
                {COPY.room.quiz.reveal}
              </Button>
            )}
          </>
        )}
        {game.revealed && (
          <>
            <p className={q.status} aria-live="polite">
              {mine !== null && (
                <b className={mine === question.answer ? qs.verdictRight : qs.verdictWrong}>
                  {mine === question.answer ? COPY.quiz.right : fill(COPY.quiz.wrong, { answer: question.options[question.answer] })}
                </b>
              )}{' '}
              {question.explain}
            </p>
            <ul className={styles.players}>
              {room.players.map((p) => {
                const a = Object.hasOwn(game.answers, p.id) ? game.answers[p.id] : null
                return (
                  <li key={p.id} className={styles.player}>
                    <span className={styles.who}>
                      {p.name}
                      {p.id === meId && <span className={styles.tag}>{COPY.room.you}</span>}
                    </span>
                    <span className={styles.points}>
                      {a === null ? (
                        COPY.room.quiz.noAnswer
                      ) : (
                        <>
                          {LETTERS[a]} {a === question.answer ? <CheckIcon weight="bold" aria-label={COPY.quiz.right} /> : <XIcon weight="bold" aria-hidden />}
                        </>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            {isHost ? (
              <Button variant="ink" block onClick={() => send({ type: 'next' })}>
                {last ? COPY.room.quiz.finish : COPY.room.quiz.next}
              </Button>
            ) : (
              <p className={styles.hint}>{COPY.room.quiz.waitNext}</p>
            )}
          </>
        )}
      </footer>
    </>
  )
}

/** „Wer wird Bierionär?“ at the table: the candidate plays on their phone, everyone watches – and can be asked. */
export function RoomBier({ room, game: party, meId, isHost, send, onExit }: Props<BierParty> & { onExit: () => void }) {
  const { game, candidate, shown } = party
  const isCandidate = meId === candidate
  const who = nameOf(room, candidate)
  const others = room.players.filter((p) => p.id !== candidate)
  const { question, step } = bierQuestion(party)
  // selection and suspense belong to one turn; the studio itself stays on screen (no flash between questions)
  const turn = `${game.step}-${game.status}-${shown}`
  const [pick, setPick] = useState<{ turn: string; option: number } | null>(null)
  const selected = pick?.turn === turn ? pick.option : null
  const setSelected = (option: number) => setPick({ turn, option })
  /** Everyone gets the same moment of suspense when the answer arrives. */
  const [settled, setSettled] = useState<string | null>(null)
  const suspense = shown && settled !== turn
  const move = (m: BierMove) => send({ type: 'bier', move: m })

  useEffect(() => {
    if (!shown) return
    const t = setTimeout(() => setSettled(turn), LOCK_MS)
    return () => clearTimeout(t)
  }, [shown, turn])

  const over = game.status !== 'playing' && !shown
  const table = game.help.table
  const myVote = table && Object.hasOwn(table.votes, meId) ? table.votes[meId] : null
  const voting = !!table && !table.closed && !shown && game.status === 'playing'
  // after the reveal and behind the result all four stay on the board
  const open = shown || over ? question.options.map((_, i) => i) : visibleOptions(game)
  const right = shown && game.status !== 'lost'

  const optionClass = (i: number) => {
    if (shown || over) {
      if (suspense) return i === game.last ? `${bs.locked} ${bs.pulse}` : ''
      if (over && game.status === 'walked') return ''
      if (i === question.answer) return bs.right
      return i === game.last ? bs.wrong : ''
    }
    if (isCandidate) return i === selected ? bs.locked : ''
    return i === myVote ? bs.locked : ''
  }

  const onChoose = shown || game.status !== 'playing' ? null : isCandidate ? setSelected : voting && myVote === null ? (i: number) => move({ type: 'vote', option: i }) : null

  const status = over ? null : shown ? (
    suspense ? (
      COPY.bierionaer.lockQuestion
    ) : (
      <>
        {right
          ? fill(COPY.bierionaer.right, { prize: kk(prizeAt(game.step)) })
          : fill(COPY.bierionaer.wrong, { answer: `${LETTERS[question.answer]}: ${question.options[question.answer]}` })}
        <span className={bs.explain}> {question.explain}</span>
      </>
    )
  ) : voting ? (
    isCandidate ? (
      COPY.room.bier.askTableYou
    ) : myVote === null ? (
      fill(COPY.room.bier.askTable, { name: who })
    ) : (
      COPY.room.bier.voted
    )
  ) : isCandidate ? (
    selected !== null ? (
      COPY.bierionaer.lockQuestion
    ) : (
      COPY.bierionaer.pick
    )
  ) : (
    fill(COPY.room.bier.watch, { name: who })
  )

  const votes = table ? Object.keys(table.votes).length : 0
  const extra = table ? (
    table.closed && !shown ? (
      votes ? (
        <PollBars title={COPY.room.bier.tableResult} icon={<HandIcon weight="fill" />} shares={tableShares(game)} open={open} />
      ) : (
        <p className={bs.voteHint}>{COPY.room.bier.noVotes}</p>
      )
    ) : voting ? (
      <p className={bs.voteHint} aria-live="polite">
        <HandIcon weight="fill" /> {fill(COPY.room.bier.votes, { n: String(votes), max: String(others.length) })}
      </p>
    ) : null
  ) : null

  const canLead = isCandidate || isHost
  const footer = shown ? (
    canLead ? (
      <Button block onClick={() => move({ type: 'next' })} disabled={suspense}>
        {game.status === 'playing' ? COPY.bierionaer.next : COPY.bierionaer.result}
      </Button>
    ) : (
      <p className={styles.hint}>{fill(COPY.room.bier.waitNext, { name: who })}</p>
    )
  ) : (
    <>
      {voting && canLead && votes > 0 && (
        <Button variant="ghost" block onClick={() => move({ type: 'tally' })}>
          {COPY.room.bier.tally}
        </Button>
      )}
      {isCandidate && selected !== null && (
        <Button block onClick={() => move({ type: 'pick', option: selected })}>
          {COPY.bierionaer.lockIn}
        </Button>
      )}
      {isCandidate && selected === null && game.step > 0 && (
        <button
          type="button"
          className={bs.walk}
          onClick={() => window.confirm(fill(COPY.bierionaer.walkConfirm, { prize: kk(prizeAt(game.step)) })) && move({ type: 'walk' })}
        >
          {COPY.bierionaer.walk} · {kk(prizeAt(game.step))}
        </button>
      )}
      {isHost && (
        <button type="button" className={bs.walk} onClick={() => window.confirm(COPY.room.abortConfirm) && send({ type: 'lobby' })}>
          {COPY.room.abort}
        </button>
      )}
    </>
  )

  const jokers = ROOM_JOKERS.filter((j: Joker) => j !== 'tisch' || others.length > 0)

  return (
    <>
      <Studio
        game={game}
        question={question}
        step={step}
        jokers={jokers}
        open={open}
        selected={isCandidate ? selected : myVote}
        optionClass={optionClass}
        onChoose={onChoose}
        onJoker={isCandidate && !shown && game.status === 'playing' ? (j) => move({ type: 'joker', joker: j }) : null}
        showHelp={!shown}
        extra={extra}
        status={status}
        footer={over ? null : footer}
        onClose={onExit}
        closeLabel={COPY.room.leave}
        sub={isCandidate ? COPY.room.bier.chairYou : fill(COPY.room.bier.chair, { name: who })}
      />
      {over && (
        <div className={q.endWrap} role="dialog" aria-modal="true" aria-labelledby="bier-room-end">
          <div className={q.end}>
            <span className={q.endScore}>{kk(winnings(game))}</span>
            <h2 id="bier-room-end" className={q.endTitle}>
              {isCandidate ? bierEndTitle(game) : fill(COPY.room.bier.result, { name: who, prize: kk(winnings(game)) })}
            </h2>
            {isCandidate && <p className={styles.hint}>{fill(COPY.room.bier.resultYou, { prize: kk(winnings(game)) })}</p>}
            <BackToTable isHost={isHost} send={send} />
          </div>
        </div>
      )}
    </>
  )
}
