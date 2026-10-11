import { MinusIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { COPY, fill } from '../../data/copy'
import { capacityOf, GLASS_BY_ID, guess as addGuess, isOver, isWin, maxScore, newFillGame, scoreGuess, STEP_ML, totalScore } from '../../domain/games/fill'
import type { FillGame as Game, Glass } from '../../domain/games/fill'
import { useApp } from '../../state/AppContext'
import { Button } from '../components/Button'
import { FillGlass } from '../components/FillGlass'
import q from './Quartett.module.css'
import styles from './FillGame.module.css'

type Phase = 'guess' | 'reveal' | 'end'

const ml = (v: number) => `${v} ml`
const litres = (v: number) => `${String(v / 1000).replace('.', COPY.app.decimal)} l`
const maxOf = (g: Glass) => Math.floor(capacityOf(g) / STEP_ML) * STEP_ML
const startValue = (g: Glass) => Math.round(g.nominal / 2 / STEP_ML) * STEP_ML

function endTitle(game: Game): string {
  const share = totalScore(game) / maxScore(game)
  return share >= 0.85 ? COPY.fill.end.top : isWin(game) ? COPY.fill.end.good : COPY.fill.end.meh
}

/** „Wie viel ist drin?“ (Stufe E2). Volumes and scoring live in domain/games/fill.ts. */
export function FillGame() {
  const { dispatch, go } = useApp()
  const [game, setGame] = useState(() => newFillGame(Date.now()))
  const [phase, setPhase] = useState<Phase>('guess')
  const [value, setValue] = useState(() => startValue(GLASS_BY_ID[game.rounds[0].glass]))
  const recorded = useRef(false)

  const index = phase === 'guess' ? game.guesses.length : game.guesses.length - 1
  const round = game.rounds[index]
  const glass = GLASS_BY_ID[round.glass]
  const max = maxOf(glass)
  const lastGuess = phase === 'guess' ? null : game.guesses[index]
  const points = lastGuess === null ? 0 : scoreGuess(round, lastGuess)

  const set = (v: number) => setValue(Math.min(max, Math.max(0, v)))

  const submit = () => {
    if (phase !== 'guess') return
    setGame((g) => addGuess(g, value))
    setPhase('reveal')
  }

  const next = () => {
    if (!isOver(game)) {
      setValue(startValue(GLASS_BY_ID[game.rounds[game.guesses.length].glass]))
      return setPhase('guess')
    }
    if (!recorded.current) {
      recorded.current = true
      dispatch({ type: 'GAME_OVER', game: 'fill', won: isWin(game), score: totalScore(game) })
    }
    setPhase('end')
  }

  const again = () => {
    const g = newFillGame(Date.now())
    recorded.current = false
    setGame(g)
    setValue(startValue(GLASS_BY_ID[g.rounds[0].glass]))
    setPhase('guess')
  }

  const quit = () => {
    if (phase !== 'end' && game.guesses.length > 0 && !window.confirm(COPY.fill.quitConfirm)) return
    go('games')
  }

  const off = lastGuess === null ? 0 : Math.abs(lastGuess - round.ml)

  return (
    <>
      <div className={q.screen}>
        <header className={q.head}>
          <button type="button" className={q.close} onClick={quit} aria-label={COPY.fill.quit}>
            <XIcon weight="bold" />
          </button>
          <span className={q.title}>{COPY.fill.title}</span>
          <span className={q.score}>{fill(COPY.fill.score, { n: String(totalScore(game)) })}</span>
        </header>
        <div className={q.meta}>
          <span>{fill(COPY.fill.round, { n: String(index + 1), max: String(game.rounds.length) })}</span>
          <span>{fill(COPY.fill.mark, { v: litres(glass.nominal) })}</span>
        </div>

        <section className={styles.stage} aria-label={COPY.fill.glasses[glass.id]}>
          <h2 className={styles.glassName}>{COPY.fill.glasses[glass.id]}</h2>
          <FillGlass glass={glass} ml={round.ml} guess={lastGuess} markLabel={litres(glass.nominal)} height={280} pourKey={index} />
        </section>

        <footer className={q.foot}>
          {phase === 'guess' ? (
            <>
              <p className={q.status}>{COPY.fill.ask}</p>
              <div className={styles.picker}>
                <button type="button" className={styles.step} onClick={() => set(value - STEP_ML)} aria-label={`− ${ml(STEP_ML)}`}>
                  <MinusIcon weight="bold" />
                </button>
                <output className={styles.value} htmlFor="fill-guess">
                  {ml(value)}
                </output>
                <button type="button" className={styles.step} onClick={() => set(value + STEP_ML)} aria-label={`+ ${ml(STEP_ML)}`}>
                  <PlusIcon weight="bold" />
                </button>
              </div>
              <input
                id="fill-guess"
                className={styles.slider}
                type="range"
                min={0}
                max={max}
                step={STEP_ML}
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                aria-label={COPY.fill.guess}
              />
              <Button variant="ink" block onClick={submit}>
                {COPY.fill.submit}
              </Button>
            </>
          ) : (
            <>
              <div className={styles.result} aria-live="polite">
                <p className={styles.truth}>
                  {fill(COPY.fill.truth, { ml: ml(round.ml) })}{' '}
                  {off === 0
                    ? fill(COPY.fill.exact, { p: String(points) })
                    : fill(COPY.fill.off, { d: ml(off), p: String(points) })}
                </p>
                <p className={styles.legend}>
                  <span className={styles.dash} aria-hidden /> {COPY.fill.yourLine}: {ml(lastGuess ?? 0)}
                </p>
                <p className={styles.fact}>{COPY.fill.facts[glass.id]}</p>
              </div>
              {phase === 'reveal' && (
                <Button variant="ink" block onClick={next}>
                  {isOver(game) ? COPY.fill.finish : COPY.fill.next}
                </Button>
              )}
            </>
          )}
        </footer>
      </div>

      {phase === 'end' && (
        <div className={q.endWrap} role="dialog" aria-modal="true" aria-labelledby="fill-end">
          <div className={q.end}>
            <span className={styles.endScore}>{fill(COPY.fill.end.score, { n: String(totalScore(game)), max: String(maxScore(game)) })}</span>
            <h2 id="fill-end" className={q.endTitle}>
              {endTitle(game)}
            </h2>
            <Button variant="ink" block onClick={again}>
              {COPY.fill.end.again}
            </Button>
            <button type="button" className={q.endBack} onClick={() => go('games')}>
              {COPY.fill.end.back}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
