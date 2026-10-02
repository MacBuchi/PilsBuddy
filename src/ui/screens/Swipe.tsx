import {
  ArrowCounterClockwiseIcon,
  DnaIcon,
  EyeIcon,
  FireIcon,
  HeartIcon,
  QuestionIcon,
  QuestionMarkIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BEER_BY_ID, DECK_ORDER, getBeer, knowRegional, rememberRegional } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { readPool, readPrefs } from '../../data/regional'
import { buildDeck } from '../../domain/deck'
import type { NearbyBeer } from '../../domain/deck'
import { formatKm } from '../../domain/regional'
import { progressMessage, quipAfterRating } from '../../domain/quips'
import type { Beer, Rating } from '../../domain/types'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { BuddyAvatar } from '../components/BuddyAvatar'
import { Button } from '../components/Button'
import { GestureLegend } from '../components/GestureLegend'
import { Sheet } from '../components/Sheet'
import { COACH_OFFSET, useCoachSteps } from '../coach'
import { SwipeCoach } from '../components/SwipeCoach'
import { SwipeDeck } from '../components/SwipeDeck'
import type { SwipeDeckHandle } from '../components/SwipeDeck'
import type { CardBadge } from '../components/BeerCard'
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

export function Swipe() {
  const { state, rate, go, openDetail, dispatch, withTabs } = useApp()
  const { ratings, onboarded } = state.profile
  const { counts, decoded, avatar, candidates, archetype } = useDerived()
  // R5 Regional-Modus: the last finder result, read once per visit (the finder lives on another screen)
  const [pool] = useState(() => (readPrefs().deck ? readPool() : []))
  const nearby = useMemo<NearbyBeer[]>(() => pool.map((p) => ({ beer: knowRegional(p.row, p.brewery), km: p.km })), [pool])
  const cards = useMemo(() => buildDeck(ratings, DECK_ORDER, BEER_BY_ID, nearby), [ratings, nearby])
  const queue = cards.map((c) => getBeer(c.id))
  const badges = useMemo(() => {
    const out: Record<string, CardBadge> = {}
    for (const c of cards.slice(0, 3)) {
      if (c.pick === 'forYou') out[c.id] = { text: fill(COPY.deck.forYou, { pct: c.pct ?? 0 }), color: RATING_COLOR.LIKE }
      if (c.pick === 'horizon') out[c.id] = { text: COPY.deck.horizon, color: RATING_COLOR.WANT_TO_TRY }
      if (c.pick === 'regional') out[c.id] = { text: fill(COPY.deck.regional, { km: formatKm(c.km ?? 0) }), color: RATING_COLOR.KNOW }
    }
    return out
  }, [cards])
  const deck = useRef<SwipeDeckHandle>(null)
  const [coachOff, setCoachOff] = useState(false)
  const [help, setHelp] = useState(false)
  const [toast, setToast] = useState<LocalToast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // a regional card the user rates or opens stays known after a reload (snapshot)
  const keep = useCallback(
    (id: string) => {
      const p = pool.find((x) => x.row.id === id)
      if (p) rememberRegional(p.row, p.brewery)
    },
    [pool],
  )
  const onCommit = useCallback(
    (beer: Beer, rating: Rating) => {
      keep(beer.id)
      rate(beer.id, rating)
      clearTimeout(toastTimer.current)
      setToast({ text: quipAfterRating({ rating, beer, before: ratings, archetype }), color: RATING_COLOR[rating], key: Date.now() })
      toastTimer.current = setTimeout(() => setToast(null), 2400)
    },
    [ratings, rate, archetype, keep],
  )

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const lastRated = state.lastRated
  const undo = useCallback(() => {
    if (!lastRated) return
    setCoachOff(true)
    deck.current?.rewind(lastRated.id, lastRated.rating)
    dispatch({ type: 'UNRATE' })
    clearTimeout(toastTimer.current)
    setToast({ text: COPY.undo.done, color: 'var(--gold)', key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [lastRated, dispatch, setCoachOff])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (help) return
      if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        undo()
        return
      }
      const r = KEYMAP[e.key]
      if (!r || e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      setCoachOff(true)
      deck.current?.commit(r)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [help, undo])

  const empty = queue.length === 0
  /** After onboarding the header shows the next recommended beer instead of the DNA % (that lives in the DNA tab). */
  const next = onboarded ? (candidates.find((c) => !ratings[c.beer.id]) ?? null) : null
  const coachActive = counts.total === 0 && !coachOff && !empty && !help
  const coach = useCoachSteps(coachActive)
  const closeHelp = useCallback(() => setHelp(false), [])
  const showAnalyze = !onboarded && counts.total >= ANALYZE_AFTER && !empty

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <BuddyAvatar archetype="logo" size={34} />
          {!next && <span className={styles.wordmark}>{COPY.app.name}</span>}
        </div>
        <div className={styles.headerRight}>
          {lastRated && (
            <button type="button" className={styles.helpBtn} onClick={undo} aria-label={COPY.undo.label}>
              <ArrowCounterClockwiseIcon weight="bold" />
            </button>
          )}
          <button type="button" className={styles.helpBtn} onClick={() => setHelp(true)} aria-label={COPY.coach.help}>
            <QuestionMarkIcon weight="bold" />
          </button>
          {next ? (
            <button
              type="button"
              className={`${styles.dnaPill} ${styles.nextChip}`}
              onClick={() => openDetail(next.beer.id)}
              aria-label={fill(COPY.nextMatch.aria, { name: next.beer.name, pct: next.pct })}
            >
              <HeartIcon weight="fill" className={styles.nextHeart} />
              <span className={styles.nextName}>{next.beer.name}</span>
              <span>{next.pct} %</span>
            </button>
          ) : (
            <button type="button" className={styles.dnaPill} onClick={() => go(onboarded ? 'dna' : 'analyzing')}>
              <DnaIcon weight="bold" /> {decoded} %
            </button>
          )}
        </div>
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

      <div className={styles.stage} onPointerDownCapture={() => setCoachOff(true)}>
        {!empty && (
          <SwipeDeck
            ref={deck}
            queue={queue}
            done={counts.total}
            total={cards.length + counts.total}
            badges={badges}
            onCommit={onCommit}
            onTap={(b) => {
              keep(b.id)
              openDetail(b.id)
            }}
            coachOffset={coachActive && coach.direction ? COACH_OFFSET[coach.direction] : null}
          />
        )}
        {empty && (
          <div className={styles.empty}>
            <div className={styles.bob}>
              <BuddyAvatar spec={avatar} size={120} />
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
        {coachActive && (
          <>
            <SwipeCoach step={coach} />
            <div className={styles.hint}>{COPY.coach.caption}</div>
          </>
        )}
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
            onClick={() => {
              setCoachOff(true)
              deck.current?.commit(rating)
            }}
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

      {help && (
        <Sheet title={COPY.coach.sheetTitle} onClose={closeHelp}>
          <p className={styles.sheetSub}>{COPY.coach.sheetSub}</p>
          <GestureLegend />
          <p className={styles.sheetKeys}>{COPY.coach.captionKeys}</p>
          <Button block onClick={closeHelp}>
            {COPY.coach.close}
          </Button>
        </Sheet>
      )}
    </div>
  )
}

