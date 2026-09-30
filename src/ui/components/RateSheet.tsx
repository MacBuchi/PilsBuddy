import { COPY, fill } from '../../data/copy'
import type { Beer, Rating } from '../../domain/types'
import { RATING_COLOR, RATING_ICON } from '../ratingStyle'
import { Sheet } from './Sheet'
import styles from './RateSheet.module.css'

interface Props {
  beer: Beer
  onRate: (rating: Rating) => void
  onClose: () => void
}

/** "Und? Wie war's?" – turns a Probierliste entry into a real verdict. */
export function RateSheet({ beer, onRate, onClose }: Props) {
  return (
    <Sheet title={COPY.rateSheet.title} onClose={onClose}>
      <p className={styles.sub}>{fill(COPY.rateSheet.sub, { name: beer.name })}</p>
      <div className={styles.options}>
        {COPY.rateSheet.options.map((o) => (
          <button key={o.rating} type="button" className={styles.option} onClick={() => onRate(o.rating)}>
            <span className={styles.icon} style={{ background: RATING_COLOR[o.rating] }}>
              {RATING_ICON[o.rating]}
            </span>
            <span className={styles.text}>
              <span className={styles.label}>{o.label}</span>
              <span className={styles.optSub}>{o.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <button type="button" className={styles.later} onClick={onClose}>
        {COPY.rateSheet.later}
      </button>
    </Sheet>
  )
}
