import { DnaIcon, EyeIcon, FireIcon, HeartIcon, QuestionIcon, XIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { getBeer } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { countRatings } from '../../domain/dna'
import { deckQueue } from '../../domain/deck'
import { progressMessage, quipAfterRating } from '../../domain/quips'
import type { Beer, Rating } from '../../domain/types'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { BuddyAvatar } from '../components/BuddyAvatar'
import { Button } from '../components/Button'
import { SwipeDeck } from '../components/SwipeDeck'
import type { SwipeDeckHandle } from '../components/SwipeDeck'
import { Toast } from '../components/Toast'
import { RATING_COLOR } from '../ratingStyle'
import styles from './Swipe.module.css'

/** Rating actions in button order; the three "big" ones are 60px, the two secondary 48px. */
const ACTIONS: { rating: Rating; icon: ReactNode; big: boolean }[] = [
  { rating: 'DISLIKE', icon: <XIcon weight="bold" />, big: true },
  { rating: 'UNKNOWN', icon: <QuestionIcon weight="bold" />, big: false },
  { rating: 'WANT_TO_TRY', icon: <FireIcon weight="fill" />, big: true },
  { rating: 'KNOW', icon: <EyeIcon weight="bold" />, big: false },
  { rating: 'LIKE', icon: <HeartIcon weight="fill" />, big: true },
]

const KEYMAP: Record<string, Rating> = {
  ArrowLeft: 'DISLIKE',
  ArrowRight: 'LIKE',
  ArrowUp: 'WANT_TO_TRY',
  ArrowDown: 'UNKNOWN',
  k: 'KNOW',
  K: 'KNOW',
}

/** Show the "DNA auswerten" nudge once this many beers are rated during onboarding. */
export const ANALYZE_AFTER = 6

interface LocalToast {
  text: string
  color: string
  key: number
}

export function Swipe({ withTabs }: { withTabs: boolean }) {
  const { state, rate, go, openDetail, dispatch } = useApp()
  const { ratings, onboarded } = state.profile
  const { counts, decoded, archetype } = useDerived()
  const queue = deckQueue(ratings).map(getBeer)
  const deck = useRef<SwipeDeckHandle>(null)
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState<LocalToast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const onCommit = useCallback(
    (beer: Beer, rating: Rating) => {
      const prevTotal = countRatings(ratings).total
      rate(beer.id, rating)
      const next = countRatings({ ...ratings, [beer.id]: { rating, at: 0 } })
      clearTimeout(toastTimer.current)
      setToast({ text: quipAfterRating(rating, beer, next, prevTotal), color: RATING_COLOR[rating], key: Date.now() })
      toastTimer.current = setTimeout(() => setToast(null), 2400)
    },
    [ratings, rate],
  )

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const r = KEYMAP[e.key]
      if (!r || e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      deck.current?.commit(r)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const empty = queue.length === 0
  const showHint = counts.total === 0 && !dragging && !empty
  const showAnalyze = !onboarded && counts.total >= ANALYZE_AFTER && !empty

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <BuddyAvatar archetype="logo" size={34} />
          <span className={styles.wordmark}>{COPY.app.name}</span>
        </div>
        <button type="button" className={styles.dnaPill} onClick={() => go(onboarded ? 'dna' : 'analyzing')}>
          <DnaIcon weight="bold" /> {decoded} %
        </button>
      </header>

      <div className={styles.progress}>
        <div className={styles.progressRow}>
          <span>{progressMessage(decoded)}</span>
          <span>{fill(COPY.swipe.left, { n: queue.length })}</span>
        </div>
        <div className={styles.bar}>
          <div className={styles.fill} style={{ width: `${decoded}%` }} />
        </div>
      </div>

      <div className={styles.stage}>
        {!empty && (
          <SwipeDeck
            ref={deck}
            queue={queue}
            onCommit={onCommit}
            onTap={(b) => openDetail(b.id)}
            onDragChange={setDragging}
          />
        )}
        {empty && (
          <div className={styles.empty}>
            <div className={styles.bob}>
              <BuddyAvatar archetype={archetype} decoded={decoded} size={120} />
            </div>
            <h2 className={styles.emptyTitle}>{COPY.swipe.emptyTitle}</h2>
            <p className={styles.emptySub}>{COPY.swipe.emptySub}</p>
            <div className={styles.emptyActions}>
              <Button size="md" onClick={() => go(onboarded ? 'dna' : 'analyzing')}>
                {onboarded ? COPY.swipe.emptyToDna : COPY.swipe.emptyAnalyze}
              </Button>
              <Button size="md" variant="ghost" onClick={() => dispatch({ type: 'RESTART_DECK' })}>
                {COPY.swipe.restart}
              </Button>
            </div>
          </div>
        )}
        {showHint && <div className={styles.hint}>{COPY.swipe.hint}</div>}
        {toast && <Toast text={toast.text} color={toast.color} position="bottom" animKey={toast.key} />}
      </div>

      {showAnalyze && (
        <div className={styles.analyzeRow}>
          <button type="button" className={styles.analyze} onClick={() => go('analyzing')}>
            <DnaIcon weight="bold" /> {COPY.swipe.analyzeCta}
          </button>
        </div>
      )}

      <div className={styles.actions} style={{ paddingBottom: withTabs ? 96 : 'calc(var(--safe-bottom) + 30px)' }}>
        {ACTIONS.map(({ rating, icon, big }) => (
          <button
            key={rating}
            type="button"
            className={styles.action}
            onClick={() => deck.current?.commit(rating)}
            disabled={empty}
            aria-label={COPY.rating[rating].label}
          >
            <span
              className={`${styles.circle} ${big ? styles.big : styles.small}`}
              style={{ color: RATING_COLOR[rating] }}
            >
              {icon}
            </span>
            <span className={styles.actionLabel}>{COPY.rating[rating].short}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

