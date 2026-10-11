import { BeerBottleIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { BEER_BY_ID, BEERS } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { flip, isFound, isOver, isPending, isWin, newMemory, pairCount, parOf, settle } from '../../domain/games/memory'
import type { MemoryGame, MemoryVariant } from '../../domain/games/memory'
import { useApp } from '../../state/AppContext'
import { BeerBottle } from '../components/BeerBottle'
import { Button } from '../components/Button'
import q from './Quartett.module.css'
import styles from './Memory.module.css'

/** How long two different cards stay up before they turn back. */
const MISS_MS = 950
/** Pause after the last pair before the result shows. */
const END_MS = 700
const PICKS = BEERS.map(({ id, style }) => ({ id, style }))
const VARIANTS: readonly MemoryVariant[] = ['bottles', 'style']

const deal = (variant: MemoryVariant) => newMemory(PICKS, variant, Date.now())

function endTitle(game: MemoryGame): string {
  if (game.moves <= pairCount(game) + 3) return COPY.memory.end.top
  return isWin(game) ? COPY.memory.end.good : COPY.memory.end.meh
}

/** Flaschen-Memory (Stufe E3). The rules live in domain/games/memory.ts. */
export function Memory() {
  const { dispatch, go } = useApp()
  const [game, setGame] = useState(() => deal('bottles'))
  /** Cards that were face up once keep their face mounted, so turning back shows it to the end. */
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set())
  const [ended, setEnded] = useState(false)
  const [status, setStatus] = useState('')
  const recorded = useRef(false)

  // two different cards: let the player look, then turn them back
  useEffect(() => {
    if (!isPending(game)) return
    const t = setTimeout(() => setGame(settle), MISS_MS)
    return () => clearTimeout(t)
  }, [game])

  useEffect(() => {
    if (!isOver(game)) return
    if (!recorded.current) {
      recorded.current = true
      dispatch({ type: 'GAME_OVER', game: 'memory', won: isWin(game), variant: game.variant, moves: game.moves })
    }
    const t = setTimeout(() => setEnded(true), END_MS)
    return () => clearTimeout(t)
  }, [game, dispatch])

  const turn = (index: number) => {
    // tapping on while a miss is still showing turns it back right away
    const base = settle(game)
    const next = flip(base, index)
    if (next === base) return setGame(base)
    setGame(next)
    setSeen((s) => (s.has(index) ? s : new Set(s).add(index)))
    if (next.moves > game.moves) {
      const found = next.found.length > game.found.length
      setStatus(found ? fill(COPY.memory.found, { name: BEER_BY_ID[next.cards[index].pair]?.name ?? '' }) : COPY.memory.miss)
    }
  }

  const restart = (variant: MemoryVariant) => {
    recorded.current = false
    setGame(deal(variant))
    setSeen(new Set())
    setEnded(false)
    setStatus('')
  }

  const running = game.moves > 0 && !isOver(game)

  const switchTo = (variant: MemoryVariant) => {
    if (variant === game.variant) return
    if (running && !window.confirm(COPY.memory.switchConfirm)) return
    restart(variant)
  }

  const quit = () => {
    if (running && !window.confirm(COPY.memory.quitConfirm)) return
    go('games')
  }

  const other = VARIANTS.find((v) => v !== game.variant) ?? 'bottles'

  return (
    <>
      <div className={q.screen}>
        <header className={q.head}>
          <button type="button" className={q.close} onClick={quit} aria-label={COPY.memory.quit}>
            <XIcon weight="bold" />
          </button>
          <span className={q.title}>{COPY.memory.title}</span>
          <span className={q.score}>{fill(COPY.memory.moves, { n: String(game.moves) })}</span>
        </header>

        <div className={styles.variants} role="radiogroup" aria-label={COPY.memory.variantLabel}>
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === game.variant}
              className={`${styles.variant} ${v === game.variant ? styles.variantOn : ''}`}
              onClick={() => switchTo(v)}
            >
              {COPY.memory.variants[v]}
            </button>
          ))}
        </div>

        <div className={q.meta}>
          <span>{fill(COPY.memory.pairs, { n: String(game.found.length), max: String(pairCount(game)) })}</span>
          <span>{fill(COPY.memory.par, { n: String(parOf(game)) })}</span>
        </div>

        <div className={styles.grid}>
          {game.cards.map((card, i) => {
            const found = isFound(game, i)
            const up = found || game.open.includes(i)
            const beer = BEER_BY_ID[card.pair]
            const name = card.face === 'style' ? beer?.style : beer?.name
            return (
              <button
                key={i}
                type="button"
                className={`${styles.card} ${up ? styles.up : ''} ${found ? styles.found : ''}`}
                onClick={() => turn(i)}
                aria-label={up ? (name ?? card.pair) : fill(COPY.memory.hidden, { n: String(i + 1) })}
                aria-pressed={up}
              >
                <span className={styles.inner} aria-hidden>
                  <span className={`${styles.side} ${styles.back}`}>
                    <span className={styles.cap}>
                      <BeerBottleIcon weight="fill" />
                    </span>
                  </span>
                  <span className={`${styles.side} ${styles.front} ${card.face === 'style' ? styles.styleFace : ''}`}>
                    {(up || seen.has(i)) && beer && card.face === 'bottle' && (
                      <>
                        <BeerBottle beer={beer} className={styles.bottle} />
                        <span className={styles.name}>{beer.name}</span>
                      </>
                    )}
                    {(up || seen.has(i)) && beer && card.face === 'style' && <span className={styles.style}>{beer.style}</span>}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <footer className={q.foot}>
          <p className={q.status} aria-live="polite">
            {status || COPY.memory.hint[game.variant]}
          </p>
        </footer>
      </div>

      {ended && (
        <div className={q.endWrap} role="dialog" aria-modal="true" aria-labelledby="memory-end">
          <div className={q.end}>
            <span className={styles.endScore}>
              {fill(COPY.memory.end.score, { n: String(game.moves), pairs: String(pairCount(game)) })}
            </span>
            <h2 id="memory-end" className={q.endTitle}>
              {endTitle(game)}
            </h2>
            <Button variant="ink" block onClick={() => restart(game.variant)}>
              {COPY.memory.end.again}
            </Button>
            <Button variant="ghost" block onClick={() => restart(other)}>
              {COPY.memory.end.other}: {COPY.memory.variants[other]}
            </Button>
            <button type="button" className={q.endBack} onClick={() => go('games')}>
              {COPY.memory.end.back}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
