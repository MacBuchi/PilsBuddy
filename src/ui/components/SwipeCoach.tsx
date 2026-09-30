import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, HandPointingIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { COPY } from '../../data/copy'
import { RATING_COLOR } from '../ratingStyle'
import { COACH_OFFSET, COACH_ORDER } from '../coach'
import type { CoachDirection, CoachStep } from '../coach'
import styles from './SwipeCoach.module.css'

const ARROW: Record<CoachDirection, ReactNode> = {
  LIKE: <ArrowRightIcon weight="bold" />,
  DISLIKE: <ArrowLeftIcon weight="bold" />,
  WANT_TO_TRY: <ArrowUpIcon weight="bold" />,
  UNKNOWN: <ArrowDownIcon weight="bold" />,
}

interface Props {
  step: CoachStep
}

/** Overlay on the first card: direction chips in the action colours plus a ghost hand. */
export function SwipeCoach({ step }: Props) {
  const { direction, running } = step
  const offset = direction ? COACH_OFFSET[direction] : { x: 0, y: 0 }
  return (
    <div className={styles.coach} aria-hidden="true">
      {COACH_ORDER.map((dir) => (
        <span
          key={dir}
          className={`${styles.chip} ${styles[dir]} ${direction === dir ? styles.active : ''}`}
          style={{ background: RATING_COLOR[dir] }}
        >
          {dir === 'DISLIKE' || dir === 'WANT_TO_TRY' ? ARROW[dir] : null}
          {COPY.coach.chips[dir]}
          {dir === 'LIKE' || dir === 'UNKNOWN' ? ARROW[dir] : null}
        </span>
      ))}
      <span
        className={`${styles.hand} ${running ? '' : styles.handGone}`}
        style={{ transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }}
      >
        <HandPointingIcon weight="fill" />
      </span>
    </div>
  )
}
