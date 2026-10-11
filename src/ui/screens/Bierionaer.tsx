import { BeerBottleIcon, ChefHatIcon, ListNumbersIcon, UsersThreeIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BEERS } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import {
  answer,
  currentQuestion,
  JOKERS,
  LADDER,
  newBierionaer,
  playJoker,
  prizeAt,
  SAFE_RUNGS,
  visibleOptions,
  walkAway,
  winnings,
} from '../../domain/games/bierionaer'
import type { Joker } from '../../domain/games/bierionaer'
import type { QuizQuestion } from '../../domain/games/quiz'
import { useApp } from '../../state/AppContext'
import { Button } from '../components/Button'
import q from './Quartett.module.css'
import styles from './Bierionaer.module.css'

/** Curated beers only – the same pool as the Bierquiz. */
const PICKS = BEERS.filter((b) => !b.regional)
/** Suspense between „Einloggen“ and the reveal. */
const LOCK_MS = 1300
const LETTERS = 'ABCD'

const deal = () => newBierionaer(PICKS, Date.now())
const kk = (n: number) => fill(COPY.bierionaer.prize, { n: n.toLocaleString(COPY.app.locale) })

const JOKER_ICON: Record<Joker, ReactNode> = {
  fifty: <span className={styles.fifty}>50:50</span>,
  stammtisch: <UsersThreeIcon weight="fill" />,
  braumeister: <ChefHatIcon weight="fill" />,
}

interface Reveal {
  question: QuizQuestion
  picked: number
  right: boolean
}

/** „Wer wird Bierionär?“ (Stufe E9) – the TV quiz in the PilsBuddy look. Rules in domain/games/bierionaer.ts. */
export function Bierionaer() {
  const { dispatch, go } = useApp()
  const [game, setGame] = useState(deal)
  const [selected, setSelected] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [ladderOpen, setLadderOpen] = useState(false)
  const [ended, setEnded] = useState(false)
  const recorded = useRef(false)

  const over = game.status !== 'playing'
  // after the end (walked away) the last question stays on stage behind the result
  const question = reveal?.question ?? currentQuestion(game) ?? game.questions[Math.min(game.step, game.questions.length - 1)]
  const step = reveal ? (reveal.right ? game.step - 1 : game.step) : game.step

  // the result counts once, when the game is decided
  useEffect(() => {
    if (!over || recorded.current) return
    recorded.current = true
    dispatch({ type: 'GAME_OVER', game: 'bierionaer', won: game.status === 'won', score: winnings(game) })
  }, [over, game, dispatch])

  // „Einloggen“ → a moment of suspense → the answer
  useEffect(() => {
    if (!locked || selected === null) return
    const t = setTimeout(() => {
      const asked = currentQuestion(game)!
      setReveal({ question: asked, picked: selected, right: selected === asked.answer })
      setGame((g) => answer(g, selected))
      setLocked(false)
    }, LOCK_MS)
    return () => clearTimeout(t)
  }, [locked, selected, game])

  const open = reveal ? question.options.map((_, i) => i) : visibleOptions(game)

  const choose = (i: number) => {
    if (locked || reveal || !open.includes(i)) return
    setSelected(i)
  }

  const joker = (j: Joker) => {
    if (locked || reveal) return
    setGame((g) => playJoker(g, j))
  }

  const next = () => {
    setSelected(null)
    setReveal(null)
    if (over) setEnded(true)
  }

  const leave = () => {
    if (!window.confirm(fill(COPY.bierionaer.walkConfirm, { prize: kk(prizeAt(game.step)) }))) return
    setGame(walkAway)
    setSelected(null)
    setEnded(true)
  }

  const quit = () => {
    if (!over && game.step + (selected === null ? 0 : 1) > 0 && !window.confirm(COPY.bierionaer.quitConfirm)) return
    go('games')
  }

  const restart = () => {
    recorded.current = false
    setGame(deal())
    setSelected(null)
    setLocked(false)
    setReveal(null)
    setEnded(false)
  }

  const optionClass = (i: number) => {
    if (reveal) {
      if (i === question.answer) return styles.right
      if (i === reveal.picked) return styles.wrong
      return ''
    }
    return i === selected ? (locked ? `${styles.locked} ${styles.pulse}` : styles.locked) : ''
  }

  const status = reveal
    ? reveal.right
      ? fill(COPY.bierionaer.right, { prize: kk(prizeAt(game.step)) })
      : fill(COPY.bierionaer.wrong, { answer: `${LETTERS[question.answer]}: ${question.options[question.answer]}` })
    : selected !== null
      ? COPY.bierionaer.lockQuestion
      : COPY.bierionaer.pick

  const { poll, tip } = reveal ? {} : game.help
  const endTitle =
    game.status === 'won'
      ? COPY.bierionaer.end.won
      : game.status === 'walked'
        ? COPY.bierionaer.end.walked
        : winnings(game) > 0
          ? COPY.bierionaer.end.lost
          : COPY.bierionaer.end.lostZero

  return (
    <>
      <div className={styles.stage}>
        <header className={q.head}>
          <button type="button" className={`${q.close} ${styles.close}`} onClick={quit} aria-label={COPY.bierionaer.quit}>
            <XIcon weight="bold" />
          </button>
          <span className={`${q.title} ${styles.title}`}>{COPY.bierionaer.title}</span>
          <button type="button" className={styles.ladderBtn} onClick={() => setLadderOpen(true)} aria-label={COPY.bierionaer.ladder}>
            <ListNumbersIcon weight="bold" />
          </button>
        </header>

        <div className={styles.jokers} role="group" aria-label="Joker">
          {JOKERS.map((j) => {
            const spent = game.used[j] !== undefined
            return (
              <button
                key={j}
                type="button"
                className={`${styles.joker} ${spent ? styles.jokerSpent : ''}`}
                onClick={() => joker(j)}
                disabled={spent || over || locked || !!reveal}
                aria-label={spent ? fill(COPY.bierionaer.jokerUsed, { joker: COPY.bierionaer.jokers[j] }) : COPY.bierionaer.jokers[j]}
                title={COPY.bierionaer.jokers[j]}
              >
                {JOKER_ICON[j]}
              </button>
            )
          })}
        </div>

        <div className={styles.rung}>
          <span>{fill(COPY.bierionaer.question, { n: String(step + 1), max: String(LADDER.length) })}</span>
          <b>{kk(LADDER[step])}</b>
        </div>

        <div className={styles.questionWrap}>
          <h2 key={step} className={styles.question}>
            {question.prompt}
          </h2>
        </div>

        {poll && (
          <div className={styles.help} aria-live="polite">
            <span className={styles.helpTitle}>
              <UsersThreeIcon weight="fill" /> {COPY.bierionaer.stammtisch}
            </span>
            <div className={styles.poll}>
              {poll.map((p, i) =>
                open.includes(i) ? (
                  <span key={i} className={styles.bar}>
                    <span className={styles.barPct}>{p} %</span>
                    <span className={styles.barFill} style={{ height: `${p * 0.62}px` }} />
                    <span className={styles.barKey}>{LETTERS[i]}</span>
                  </span>
                ) : null,
              )}
            </div>
          </div>
        )}
        {tip && (
          <p className={styles.help} aria-live="polite">
            <ChefHatIcon weight="fill" />{' '}
            {fill(tip.sure ? COPY.bierionaer.brewerSure : COPY.bierionaer.brewerUnsure, {
              answer: `${LETTERS[tip.option]}: ${question.options[tip.option]}`,
            })}
          </p>
        )}

        <div className={styles.options}>
          {question.options.map((option, i) => (
            <button
              key={`${step}-${i}`}
              type="button"
              className={`${styles.option} ${optionClass(i)}`}
              onClick={() => choose(i)}
              disabled={!open.includes(i) || locked || !!reveal}
              aria-pressed={i === selected}
              style={open.includes(i) ? undefined : { visibility: 'hidden' }}
            >
              <span className={styles.letter}>{LETTERS[i]}:</span> {option}
            </button>
          ))}
        </div>

        <footer className={styles.foot}>
          <p className={styles.status} aria-live="polite">
            {status}
            {reveal && <span className={styles.explain}> {question.explain}</span>}
          </p>
          {reveal ? (
            <Button block onClick={next}>
              {over ? COPY.bierionaer.result : COPY.bierionaer.next}
            </Button>
          ) : selected !== null ? (
            <Button block onClick={() => setLocked(true)} disabled={locked}>
              {COPY.bierionaer.lockIn}
            </Button>
          ) : (
            game.step > 0 && (
              <button type="button" className={styles.walk} onClick={leave}>
                {COPY.bierionaer.walk} · {kk(prizeAt(game.step))}
              </button>
            )
          )}
        </footer>
      </div>

      {ladderOpen && (
        <div className={q.endWrap} role="dialog" aria-modal="true" aria-label={COPY.bierionaer.ladder} onClick={() => setLadderOpen(false)}>
          <ol className={styles.ladder}>
            {[...LADDER.keys()]
              .reverse()
              .map((i) => (
                <li
                  key={i}
                  className={`${styles.ladderRow} ${i === game.step ? styles.ladderNow : ''} ${i < game.step ? styles.ladderDone : ''} ${
                    (SAFE_RUNGS as readonly number[]).includes(i + 1) ? styles.ladderSafe : ''
                  }`}
                >
                  <span>{i + 1}</span>
                  <b>{LADDER[i].toLocaleString(COPY.app.locale)}</b>
                </li>
              ))}
            <li className={styles.ladderHint}>
              <BeerBottleIcon weight="fill" /> {COPY.bierionaer.safe}: {SAFE_RUNGS.map((r) => LADDER[r - 1].toLocaleString(COPY.app.locale)).join(' · ')}
            </li>
          </ol>
        </div>
      )}

      {ended && (
        <div className={q.endWrap} role="dialog" aria-modal="true" aria-labelledby="bier-end">
          <div className={q.end}>
            <span className={q.endScore}>{kk(winnings(game))}</span>
            <h2 id="bier-end" className={q.endTitle}>
              {endTitle}
            </h2>
            <Button variant="ink" block onClick={restart}>
              {COPY.bierionaer.end.again}
            </Button>
            <button type="button" className={q.endBack} onClick={() => go('games')}>
              {COPY.bierionaer.end.back}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
