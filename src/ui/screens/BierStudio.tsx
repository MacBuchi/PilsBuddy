import { BeerBottleIcon, ChefHatIcon, HandIcon, ListNumbersIcon, UsersThreeIcon, XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { COPY, fill } from '../../data/copy'
import { LADDER, SAFE_RUNGS } from '../../domain/games/bierionaer'
import type { BierionaerGame, Joker } from '../../domain/games/bierionaer'
import type { QuizQuestion } from '../../domain/games/quiz'
import { kk, LETTERS } from './bierFormat'
import q from './Quartett.module.css'
import styles from './Bierionaer.module.css'

/**
 * The „Wer wird Bierionär?“ studio (Stufe E9) – stage, jokers, question, answers, help and the ladder – shared by the
 * game on one phone and the one at the room's table (E8). It only renders; the screens hold the state.
 */


const JOKER_ICON: Record<Joker, ReactNode> = {
  fifty: <span className={styles.fifty}>50:50</span>,
  stammtisch: <UsersThreeIcon weight="fill" />,
  braumeister: <ChefHatIcon weight="fill" />,
  tisch: <HandIcon weight="fill" />,
}

/** Votes per option as bars (Stammtisch or the table); hidden options leave a gap. */
export function PollBars({ title, icon, shares, open }: { title: string; icon: ReactNode; shares: number[]; open: number[] }) {
  return (
    <div className={styles.help} aria-live="polite">
      <span className={styles.helpTitle}>
        {icon} {title}
      </span>
      <div className={styles.poll}>
        {shares.map((p, i) =>
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
  )
}

interface StudioProps {
  game: BierionaerGame
  /** The question on stage and its rung (0-based). */
  question: QuizQuestion
  step: number
  jokers: readonly Joker[]
  /** Options still on the board (50:50 hides two). */
  open: number[]
  /** The option picked on this device, if any. */
  selected?: number | null
  /** Extra class per option (selected, locked, right, wrong). */
  optionClass: (i: number) => string
  /** Null: the options are not clickable on this device. */
  onChoose: ((i: number) => void) | null
  onJoker: ((j: Joker) => void) | null
  /** Stammtisch, Braumeister and table help are shown. */
  showHelp: boolean
  /** Extra help or status above the answers (the table vote). */
  extra?: ReactNode
  status: ReactNode
  footer: ReactNode
  onClose: () => void
  closeLabel: string
  /** A line under the title, e.g. who sits in the chair. */
  sub?: ReactNode
}

export function Studio(p: StudioProps) {
  const [ladderOpen, setLadderOpen] = useState(false)
  const { game, question, step, open } = p
  const { poll, tip } = p.showHelp ? game.help : {}

  return (
    <>
      <div className={styles.stage}>
        <header className={q.head}>
          <button type="button" className={`${q.close} ${styles.close}`} onClick={p.onClose} aria-label={p.closeLabel}>
            <XIcon weight="bold" />
          </button>
          <span className={`${q.title} ${styles.title}`}>{COPY.bierionaer.title}</span>
          <button type="button" className={styles.ladderBtn} onClick={() => setLadderOpen(true)} aria-label={COPY.bierionaer.ladder}>
            <ListNumbersIcon weight="bold" />
          </button>
        </header>
        {p.sub && <p className={styles.sub}>{p.sub}</p>}

        <div className={styles.jokers} role="group" aria-label="Joker">
          {p.jokers.map((j) => {
            const spent = game.used[j] !== undefined
            return (
              <button
                key={j}
                type="button"
                className={`${styles.joker} ${spent ? styles.jokerSpent : ''}`}
                onClick={() => p.onJoker?.(j)}
                disabled={spent || !p.onJoker}
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

        {poll && <PollBars title={COPY.bierionaer.stammtisch} icon={<UsersThreeIcon weight="fill" />} shares={poll} open={open} />}
        {tip && (
          <p className={styles.help} aria-live="polite">
            <ChefHatIcon weight="fill" />{' '}
            {fill(tip.sure ? COPY.bierionaer.brewerSure : COPY.bierionaer.brewerUnsure, {
              answer: `${LETTERS[tip.option]}: ${question.options[tip.option]}`,
            })}
          </p>
        )}
        {p.extra}

        <div className={styles.options}>
          {question.options.map((option, i) => (
            <button
              key={`${step}-${i}`}
              type="button"
              className={`${styles.option} ${p.optionClass(i)}`}
              onClick={() => p.onChoose?.(i)}
              disabled={!open.includes(i) || !p.onChoose}
              aria-pressed={i === p.selected}
              style={open.includes(i) ? undefined : { visibility: 'hidden' }}
            >
              <span className={styles.letter}>{LETTERS[i]}:</span> {option}
            </button>
          ))}
        </div>

        <footer className={styles.foot}>
          <p className={styles.status} aria-live="polite">
            {p.status}
          </p>
          {p.footer}
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
    </>
  )
}
