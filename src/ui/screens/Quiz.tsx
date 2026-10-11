import { CheckIcon, XIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { BEER_BY_ID, BEERS } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { isRight, isWin, newQuiz, pick, QUIZ_PASS, scoreOf } from '../../domain/games/quiz'
import type { QuizGame } from '../../domain/games/quiz'
import { useApp } from '../../state/AppContext'
import { BeerBottle } from '../components/BeerBottle'
import { Button } from '../components/Button'
import q from './Quartett.module.css'
import styles from './Quiz.module.css'

/** Curated beers only – regional ones carry style estimates, not facts to quiz on. */
const PICKS = BEERS.filter((b) => !b.regional)

const deal = () => newQuiz(PICKS, Date.now())

function endTitle(game: QuizGame): string {
  const n = scoreOf(game)
  if (n >= game.questions.length - 1) return COPY.quiz.end.top
  return n >= QUIZ_PASS ? COPY.quiz.end.good : COPY.quiz.end.meh
}

/** Bierquiz (Stufe E7). The questions and rules live in domain/games/quiz.ts. */
export function Quiz() {
  const { dispatch, go } = useApp()
  const [game, setGame] = useState(deal)
  /** The question on screen; it lags one behind `game.picks` while the answer is shown. */
  const [shown, setShown] = useState(0)
  const [ended, setEnded] = useState(false)
  const recorded = useRef(false)

  const total = game.questions.length
  const question = game.questions[Math.min(shown, total - 1)]
  const answered = game.picks.length > shown
  const chosen = game.picks[shown]
  const last = shown === total - 1

  const choose = (option: number) => {
    if (!answered) setGame((g) => pick(g, option))
  }

  const next = () => {
    if (!answered) return
    if (!last) return setShown((n) => n + 1)
    if (!recorded.current) {
      recorded.current = true
      dispatch({ type: 'GAME_OVER', game: 'quiz', won: isWin(game), score: scoreOf(game) })
    }
    setEnded(true)
  }

  const restart = () => {
    recorded.current = false
    setGame(deal())
    setShown(0)
    setEnded(false)
  }

  const quit = () => {
    if (game.picks.length > 0 && !ended && !window.confirm(COPY.quiz.quitConfirm)) return
    go('games')
  }

  const beer = question.beer ? BEER_BY_ID[question.beer] : undefined

  return (
    <>
      <div className={q.screen}>
        <header className={q.head}>
          <button type="button" className={q.close} onClick={quit} aria-label={COPY.quiz.quit}>
            <XIcon weight="bold" />
          </button>
          <span className={q.title}>{COPY.quiz.title}</span>
          <span className={q.score}>{fill(COPY.quiz.score, { n: String(scoreOf(game)) })}</span>
        </header>

        <div className={q.meta}>
          <span>{fill(COPY.quiz.progress, { n: String(shown + 1), max: String(total) })}</span>
        </div>
        <div className={styles.track} aria-hidden>
          {game.questions.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i < game.picks.length ? (isRight(game, i) ? styles.dotRight : styles.dotWrong) : ''} ${i === shown ? styles.dotNow : ''}`}
            />
          ))}
        </div>

        <section key={shown} className={styles.card}>
          {beer && question.kind !== 'abv' && <BeerBottle beer={beer} size={120} className={styles.bottle} />}
          <h2 className={styles.prompt}>{question.prompt}</h2>
        </section>

        <div className={styles.options} role="group" aria-label={question.prompt}>
          {question.options.map((option, i) => {
            const state = !answered ? '' : i === question.answer ? styles.right : i === chosen ? styles.wrong : styles.dim
            return (
              <button
                key={`${shown}-${i}`}
                type="button"
                className={`${styles.option} ${state}`}
                onClick={() => choose(i)}
                disabled={answered}
                aria-pressed={answered && i === chosen}
              >
                <span className={styles.letter} aria-hidden>
                  {answered && i === question.answer ? <CheckIcon weight="bold" /> : answered && i === chosen ? <XIcon weight="bold" /> : 'ABCD'[i]}
                </span>
                <span className={styles.optionText}>{option}</span>
              </button>
            )
          })}
        </div>

        <footer className={q.foot}>
          <p className={q.status} aria-live="polite">
            {answered && (
              <>
                <b className={chosen === question.answer ? styles.verdictRight : styles.verdictWrong}>
                  {chosen === question.answer
                    ? COPY.quiz.right
                    : fill(COPY.quiz.wrong, { answer: question.options[question.answer] })}
                </b>{' '}
                {question.explain}
              </>
            )}
          </p>
          {answered && (
            <Button variant="ink" block onClick={next}>
              {last ? COPY.quiz.finish : COPY.quiz.next}
            </Button>
          )}
        </footer>
      </div>

      {ended && (
        <div className={q.endWrap} role="dialog" aria-modal="true" aria-labelledby="quiz-end">
          <div className={q.end}>
            <span className={q.endScore}>{fill(COPY.quiz.end.score, { n: String(scoreOf(game)), max: String(total) })}</span>
            <h2 id="quiz-end" className={q.endTitle}>
              {endTitle(game)}
            </h2>
            <Button variant="ink" block onClick={restart}>
              {COPY.quiz.end.again}
            </Button>
            <button type="button" className={q.endBack} onClick={() => go('games')}>
              {COPY.quiz.end.back}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
