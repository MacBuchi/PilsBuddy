import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BeerBottleIcon,
  CheckIcon,
  EyeIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { COPY } from '../../data/copy'
import type { Rating } from '../../domain/types'
import { useApp } from '../../state/AppContext'
import { Button } from '../components/Button'
import { RATING_COLOR } from '../ratingStyle'
import styles from './Howto.module.css'

const GESTURE_ICON: Record<Rating, ReactNode> = {
  LIKE: <ArrowRightIcon weight="bold" />,
  DISLIKE: <ArrowLeftIcon weight="bold" />,
  WANT_TO_TRY: <ArrowUpIcon weight="bold" />,
  UNKNOWN: <ArrowDownIcon weight="bold" />,
  KNOW: <EyeIcon weight="bold" />,
}

export function Howto() {
  const { state, dispatch, go, toast } = useApp()
  const age = state.profile.ageConfirmed

  const start = () => {
    if (!age) {
      toast(COPY.howto.ageMissing)
      return
    }
    go('swipe')
  }

  return (
    <div className={styles.screen}>
      <Button variant="icon" aria-label="Zurück" onClick={() => go('welcome')}>
        <ArrowLeftIcon weight="bold" />
      </Button>

      <div className={styles.intro}>
        <div className="t-label">{COPY.howto.step}</div>
        <h1 className={styles.title}>{COPY.howto.title}</h1>
        <p className={styles.sub}>{COPY.howto.sub}</p>
      </div>

      <div className={styles.grid}>
        {COPY.howto.gestures.map((g, i) => (
          <div key={g.rating} className={styles.card} style={i === 4 ? { gridColumn: '1 / -1' } : undefined}>
            <span className={styles.badge} style={{ background: RATING_COLOR[g.rating] }}>
              {GESTURE_ICON[g.rating]}
            </span>
            <span className={styles.cardText}>
              <span className={styles.cardLabel}>{g.label}</span>
              <span className={styles.cardSub}>{g.sub}</span>
            </span>
          </div>
        ))}
      </div>

      <div className={styles.spacer} />

      <button
        type="button"
        className={styles.age}
        role="checkbox"
        aria-checked={age}
        onClick={() => dispatch({ type: 'SET_AGE', value: !age })}
      >
        <span className={styles.box} style={{ background: age ? 'var(--gold)' : 'transparent' }}>
          {age && <CheckIcon weight="bold" />}
        </span>
        <span className={styles.ageText}>
          <span className={styles.ageLabel}>{COPY.howto.age}</span>
          <span className={styles.ageSub}>{COPY.howto.ageSub}</span>
        </span>
      </button>

      <Button block onClick={start} style={{ opacity: age ? 1 : 0.45 }} aria-disabled={!age}>
        {COPY.howto.cta} <BeerBottleIcon weight="bold" />
      </Button>
    </div>
  )
}
