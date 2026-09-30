import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, EyeIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { COPY } from '../../data/copy'
import type { Rating } from '../../domain/types'
import { RATING_COLOR } from '../ratingStyle'
import styles from './GestureLegend.module.css'

const GESTURE_ICON: Record<Rating, ReactNode> = {
  LIKE: <ArrowRightIcon weight="bold" />,
  DISLIKE: <ArrowLeftIcon weight="bold" />,
  WANT_TO_TRY: <ArrowUpIcon weight="bold" />,
  UNKNOWN: <ArrowDownIcon weight="bold" />,
  KNOW: <EyeIcon weight="bold" />,
}

/** The five gestures as a 2-column card grid – used in Howto and in the swipe help sheet. */
export function GestureLegend() {
  return (
    <div className={styles.grid}>
      {COPY.howto.gestures.map((g, i) => (
        <div key={g.rating} className={styles.card} style={i === 4 ? { gridColumn: '1 / -1' } : undefined}>
          <span className={styles.badge} style={{ background: RATING_COLOR[g.rating] }}>
            {GESTURE_ICON[g.rating]}
          </span>
          <span className={styles.text}>
            <span className={styles.label}>{g.label}</span>
            <span className={styles.sub}>{g.sub}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
