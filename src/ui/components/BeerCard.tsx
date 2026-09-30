import { COPY } from '../../data/copy'
import { formatAbv } from '../../data/beers'
import type { Beer, Rating } from '../../domain/types'
import { isDarkBeer, textOnBeer } from '../color'
import styles from './BeerCard.module.css'

export type StampOpacity = Partial<Record<Rating, number>>

interface Props {
  beer: Beer
  /** "07/42" */
  position: string
  stamps?: StampOpacity
  /** Fade stamps smoothly (tutorial animation); during a real drag they follow 1:1. */
  smoothStamps?: boolean
}

/**
 * The beer as a Bierdeckel: upper half is "the glass" (beer colour + foam edge + bottle),
 * lower half the profile text. Stamps fade in proportionally to the drag.
 */
export function BeerCard({ beer, position, stamps = {}, smoothStamps = false }: Props) {
  const fade = smoothStamps ? 'opacity .45s ease' : undefined
  const ink = textOnBeer(beer.color)
  const dark = isDarkBeer(beer.color)
  return (
    <div className={styles.card}>
      <div className={styles.glass} style={{ background: beer.color, color: ink }}>
        <div className={styles.foam} />
        <div className={styles.scallop} />
        <span className={styles.bubble} style={{ left: '14%', bottom: '22%', width: 7, height: 7 }} />
        <span className={styles.bubble} style={{ left: '22%', bottom: '40%', width: 4, height: 4 }} />
        <span className={styles.bubble} style={{ right: '16%', bottom: '30%', width: 6, height: 6 }} />
        <span className={styles.bubble} style={{ right: '24%', bottom: '58%', width: 3, height: 3 }} />
        <div className={styles.meta}>
          <span>
            {beer.style} · {formatAbv(beer.abv)}
          </span>
          <span>{position}</span>
        </div>
        {beer.image ? (
          <img className={styles.photo} src={beer.image} alt={beer.fullName} draggable={false} />
        ) : (
          <div className={`${styles.placeholder} ${dark ? styles.placeholderDark : ''}`}>
            <span>{COPY.swipe.photoPlaceholder}</span>
          </div>
        )}

        <div className={`${styles.stamp} ${styles.stampLike}`} style={{ opacity: stamps.LIKE ?? 0, transition: fade }}>
          {COPY.rating.LIKE.stamp}
        </div>
        <div className={`${styles.stamp} ${styles.stampNope}`} style={{ opacity: stamps.DISLIKE ?? 0, transition: fade }}>
          {COPY.rating.DISLIKE.stamp}
        </div>
        <div className={`${styles.stamp} ${styles.stampTry}`} style={{ opacity: stamps.WANT_TO_TRY ?? 0, transition: fade }}>
          {COPY.rating.WANT_TO_TRY.stamp}
        </div>
        <div className={`${styles.stamp} ${styles.stampUnknown}`} style={{ opacity: stamps.UNKNOWN ?? 0, transition: fade }}>
          {COPY.rating.UNKNOWN.stamp}
        </div>
        <div className={`${styles.stamp} ${styles.stampKnow}`} style={{ opacity: stamps.KNOW ?? 0, transition: fade }}>
          {COPY.rating.KNOW.stamp}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.name}>{beer.name}</span>
          <span className={styles.region}>{beer.region}</span>
        </div>
        <p className={styles.line}>„{beer.humorousBio}“</p>
        <div className={styles.tags}>
          {beer.tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
