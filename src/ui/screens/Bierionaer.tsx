import { useEffect, useRef, useState } from 'react'
import { BEERS } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { answer, currentQuestion, JOKERS, newBierionaer, playJoker, prizeAt, visibleOptions, walkAway, winnings } from '../../domain/games/bierionaer'
import type { Joker } from '../../domain/games/bierionaer'
import type { QuizQuestion } from '../../domain/games/quiz'
import { useApp } from '../../state/AppContext'
import { Button } from '../components/Button'
import { bierEndTitle, kk, LETTERS, LOCK_MS } from './bierFormat'
import { Studio } from './BierStudio'
import q from './Quartett.module.css'
import styles from './Bierionaer.module.css'

/** Curated beers only – the same pool as the Bierquiz. */
const PICKS = BEERS.filter((b) => !b.regional)

const deal = () => newBierionaer(PICKS, Date.now())

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
  const busy = over || locked || !!reveal

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

  const status = reveal ? (
    <>
      {reveal.right
        ? fill(COPY.bierionaer.right, { prize: kk(prizeAt(game.step)) })
        : fill(COPY.bierionaer.wrong, { answer: `${LETTERS[question.answer]}: ${question.options[question.answer]}` })}
      <span className={styles.explain}> {question.explain}</span>
    </>
  ) : selected !== null ? (
    COPY.bierionaer.lockQuestion
  ) : (
    COPY.bierionaer.pick
  )

  return (
    <>
      <Studio
        game={game}
        question={question}
        step={step}
        jokers={JOKERS}
        open={open}
        selected={selected}
        optionClass={optionClass}
        onChoose={busy ? null : choose}
        onJoker={busy ? null : joker}
        showHelp={!reveal}
        status={status}
        onClose={quit}
        closeLabel={COPY.bierionaer.quit}
        footer={
          reveal ? (
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
          )
        }
      />

      {ended && (
        <div className={q.endWrap} role="dialog" aria-modal="true" aria-labelledby="bier-end">
          <div className={q.end}>
            <span className={q.endScore}>{kk(winnings(game))}</span>
            <h2 id="bier-end" className={q.endTitle}>
              {bierEndTitle(game)}
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
