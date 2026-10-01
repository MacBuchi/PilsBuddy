import { XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { BEER_BY_ID, BEERS, formatAbv } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { botChoice, newQuartett, playStat, QUARTETT_STATS, statValue } from '../../domain/games/quartett'
import type { QuartettRound, QuartettState, StatKey } from '../../domain/games/quartett'
import type { Beer } from '../../domain/types'
import { useApp } from '../../state/AppContext'
import { textOnBeer } from '../color'
import { BeerBottle } from '../components/BeerBottle'
import { Button } from '../components/Button'
import styles from './Quartett.module.css'

type Phase = 'choose' | 'bot' | 'reveal' | 'end'
type Mark = 'win' | 'lose' | 'tie'

const BOT_THINK_MS = 1100
const IDS = BEERS.map((b) => b.id)
const STAT_LABEL = Object.fromEntries(QUARTETT_STATS.map((s) => [s.key, s.label])) as Record<StatKey, string>

const show = (key: StatKey, v: number) => (key === 'abv' ? formatAbv(v) : String(v))
/** Bar length: taste axes are 0–100, alcohol is scaled to a strong Doppelbock (12 %). */
const barPct = (key: StatKey, v: number) => Math.min(100, key === 'abv' ? (v / 12) * 100 : v)

function quip(r: QuartettRound, round: number): string {
  const list = r.outcome === 'tie' ? COPY.quartett.tie : r.outcome === 0 ? COPY.quartett.win : COPY.quartett.lose
  const [mine, theirs] = r.cards.map((id) => BEER_BY_ID[id].name)
  return fill(list[round % list.length], {
    mine,
    theirs,
    stat: STAT_LABEL[r.stat],
    vm: show(r.stat, r.values[0]),
    vt: show(r.stat, r.values[1]),
  })
}

const markOf = (r: QuartettRound): Mark => (r.outcome === 'tie' ? 'tie' : r.outcome === 0 ? 'win' : 'lose')
const startPhase = (g: QuartettState): Phase => (g.turn === 0 ? 'choose' : 'bot')

/** Bier-Quartett against the Kneipen-Bot (Stufe E1). The rules live in domain/games/quartett.ts. */
export function Quartett() {
  const { dispatch, go } = useApp()
  const [game, setGame] = useState(() => newQuartett(IDS, Date.now()))
  const [phase, setPhase] = useState<Phase>(() => startPhase(game))
  const recorded = useRef(false)

  // the bot's turn: think a moment, then name its stat
  useEffect(() => {
    if (phase !== 'bot') return
    const t = setTimeout(() => {
      setGame((g) => playStat(g, botChoice(g, BEER_BY_ID), BEER_BY_ID))
      setPhase('reveal')
    }, BOT_THINK_MS)
    return () => clearTimeout(t)
  }, [phase])

  const pick = (stat: StatKey) => {
    if (phase !== 'choose') return
    setGame((g) => playStat(g, stat, BEER_BY_ID))
    setPhase('reveal')
  }

  const next = () => {
    if (game.winner === null) return setPhase(startPhase(game))
    if (!recorded.current) {
      recorded.current = true
      dispatch({ type: 'GAME_OVER', game: 'quartett', won: game.winner === 0 })
    }
    setPhase('end')
  }

  const again = () => {
    const g = newQuartett(IDS, Date.now())
    recorded.current = false
    setGame(g)
    setPhase(startPhase(g))
  }

  const quit = () => {
    if (phase !== 'end' && game.round > 0 && !window.confirm(COPY.quartett.quitConfirm)) return
    go('games')
  }

  const last = phase === 'reveal' || phase === 'end' ? game.last : null
  // while a round is shown, the cards are the ones just played (they already moved in the state)
  const myBeer = BEER_BY_ID[last ? last.cards[0] : game.piles[0][0]]
  const theirBeer = last ? BEER_BY_ID[last.cards[1]] : null
  const mark = last ? markOf(last) : null
  const counts = [game.piles[0].length, game.piles[1].length]

  const status =
    phase === 'choose'
      ? COPY.quartett.yourTurn
      : phase === 'bot'
        ? COPY.quartett.botTurn
        : last
          ? `${fill(last.chooser === 0 ? COPY.quartett.youPick : COPY.quartett.botPicks, { stat: STAT_LABEL[last.stat] })} ${quip(last, game.round)}`
          : ''

  return (
    <>
      <div className={styles.screen}>
        <header className={styles.head}>
          <button type="button" className={styles.close} onClick={quit} aria-label={COPY.quartett.quit}>
            <XIcon weight="bold" />
          </button>
          <span className={styles.title}>{COPY.quartett.title}</span>
          <span className={styles.score} aria-label={`${COPY.quartett.you} ${counts[0]}, ${COPY.quartett.bot} ${counts[1]}`}>
            {fill(COPY.quartett.score, {
              you: String(counts[0]),
              bot: String(counts[1]),
            })}
          </span>
        </header>
        <div className={styles.meta}>
          <span>
            {fill(COPY.quartett.round, {
              n: String(Math.min(game.round + (last ? 0 : 1), game.maxRounds)),
              max: String(game.maxRounds),
            })}
          </span>
          {game.pot.length > 0 && <span className={styles.pot}>{fill(COPY.quartett.pot, { n: String(game.pot.length) })}</span>}
        </div>

        <div className={styles.table}>
          <OpponentCard beer={theirBeer} round={last} thinking={phase === 'bot'} cards={counts[1]} mark={mark} />
          {myBeer && (
            <QuartettCard
              beer={myBeer}
              picked={last?.stat ?? null}
              mark={mark}
              onPick={phase === 'choose' ? pick : undefined}
              key={myBeer.id + game.round}
            />
          )}
        </div>

        <footer className={styles.foot}>
          <p className={`${styles.status} ${mark ? styles[mark] : ''}`} aria-live="polite">
            {status}
          </p>
          {phase === 'reveal' && (
            <Button variant="ink" block onClick={next}>
              {COPY.quartett.next}
            </Button>
          )}
        </footer>
      </div>

      {phase === 'end' && game.winner !== null && (
        <div className={styles.endWrap} role="dialog" aria-modal="true" aria-labelledby="quartett-end">
          <div className={styles.end}>
            <span className={styles.endScore}>
              {fill(COPY.quartett.score, {
                you: String(counts[0]),
                bot: String(counts[1]),
              })}
            </span>
            <h2 id="quartett-end" className={styles.endTitle}>
              {game.winner === 'draw' ? COPY.quartett.end.draw : game.winner === 0 ? COPY.quartett.end.won : COPY.quartett.end.lost}
            </h2>
            <Button variant="ink" block onClick={again}>
              {COPY.quartett.end.again}
            </Button>
            <button type="button" className={styles.endBack} onClick={() => go('games')}>
              {COPY.quartett.end.back}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function QuartettCard({ beer, picked, mark, onPick }: { beer: Beer; picked: StatKey | null; mark: Mark | null; onPick?: (s: StatKey) => void }) {
  const ink = textOnBeer(beer.color)
  return (
    <article className={styles.card} aria-label={beer.fullName}>
      <div className={styles.cardHead} style={{ background: beer.color, color: ink }}>
        <BeerBottle beer={beer} size={88} className={styles.cardBottle} />
        <div className={styles.cardName}>
          <span className={styles.cardStyle}>{beer.style}</span>
          <span className={styles.cardTitle}>{beer.name}</span>
          <span className={styles.cardBrewery}>{beer.brewery}</span>
        </div>
      </div>
      <ul className={styles.rows}>
        {QUARTETT_STATS.map(({ key, label }) => {
          const v = statValue(beer, key)
          const on = picked === key
          return (
            <li key={key}>
              <button
                type="button"
                className={`${styles.row} ${on && mark ? styles[mark] : ''} ${on ? styles.rowOn : ''}`}
                disabled={!onPick}
                onClick={() => onPick?.(key)}
                aria-label={`${label} ${show(key, v)}`}
              >
                <span className={styles.rowLabel}>{label}</span>
                <span className={styles.rowBar}>
                  <span
                    style={{
                      width: `${barPct(key, v)}%`,
                      background: beer.color,
                    }}
                  />
                </span>
                <span className={styles.rowValue}>{show(key, v)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

function OpponentCard({
  beer,
  round,
  thinking,
  cards,
  mark,
}: {
  beer: Beer | null
  round: QuartettRound | null
  thinking: boolean
  cards: number
  mark: Mark | null
}) {
  if (!beer || !round) {
    return (
      <div className={`${styles.opp} ${styles.oppBack} ${thinking ? styles.thinking : ''}`} aria-label={COPY.quartett.bot}>
        <span className={styles.oppBackText}>{COPY.quartett.cardBack}</span>
        <span className={styles.oppCount}>
          {COPY.quartett.bot} · {fill(COPY.quartett.cards, { n: String(cards) })}
        </span>
      </div>
    )
  }
  const ink = textOnBeer(beer.color)
  // green marks the winning value on either card: our win is this card's loss
  const own = mark === 'win' ? 'lose' : mark === 'lose' ? 'win' : mark
  return (
    <div
      className={`${styles.opp} ${styles.flip}`}
      style={{ background: beer.color, color: ink }}
      aria-label={`${COPY.quartett.bot}: ${beer.fullName}`}
    >
      <BeerBottle beer={beer} size={56} className={styles.oppBottle} />
      <span className={styles.oppName}>
        <span className={styles.cardStyle}>{beer.style}</span>
        <span className={styles.oppTitle}>{beer.name}</span>
      </span>
      <span className={`${styles.oppValue} ${own ? styles[own] : ''}`}>
        <span className={styles.oppStat}>{STAT_LABEL[round.stat]}</span>
        {show(round.stat, round.values[1])}
      </span>
    </div>
  )
}
