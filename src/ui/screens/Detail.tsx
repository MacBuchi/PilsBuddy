import { ArrowLeftIcon, HeartIcon } from '@phosphor-icons/react'
import { BEER_BY_ID, formatAbv } from '../../data/beers'
import { COPY, fill, pick } from '../../data/copy'
import { DISPLAY_AXES } from '../../domain/dna'
import { compatibility } from '../../domain/matching'
import { hashId, relationQuip } from '../../domain/quips'
import { RATINGS } from '../../domain/types'
import type { Rating } from '../../domain/types'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { RATING_COLOR, RATING_ICON } from '../ratingStyle'
import { BottleArt } from '../components/BottleArt'
import styles from './Detail.module.css'

export function Detail() {
  const { state, go, rate, toast } = useApp()
  const { dna, candidates } = useDerived()
  const beer = (state.detailId && BEER_BY_ID[state.detailId]) || candidates[0]?.beer
  if (!beer) return null

  const pct = compatibility(dna.taste, beer.taste)
  const current = state.profile.ratings[beer.id]?.rating

  const setRelation = (r: Rating) => {
    rate(beer.id, r)
    const line =
      r === 'DISLIKE' && beer.disLikeQuip ? beer.disLikeQuip : fill(pick(COPY.quips[r], hashId(beer.id)), { name: beer.name })
    toast(line, RATING_COLOR[r])
  }

  const back = () => go(state.detailFrom === 'detail' ? 'swipe' : state.detailFrom)

  return (
    <div className={styles.screen}>
      <div className={styles.hero} style={{ background: beer.color }}>
        <div className={styles.foam} />
        <div className={styles.scallop} />
        {beer.image ? (
          <img className={styles.photo} src={beer.image} alt={beer.fullName} />
        ) : (
          <BottleArt beer={beer} className={styles.art} />
        )}
        <button type="button" className={styles.back} onClick={back} aria-label="Zurück">
          <ArrowLeftIcon weight="bold" />
        </button>
        <div className={styles.matchPill}>
          <HeartIcon weight="fill" /> {fill(COPY.detail.match, { pct })}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{beer.fullName}</h1>
          <p className={styles.line}>„{beer.humorousBio}“</p>
        </div>

        <div className={styles.facts}>
          {[
            [COPY.detail.style, beer.style],
            [COPY.detail.abv, formatAbv(beer.abv)],
            [COPY.detail.origin, beer.region],
          ].map(([k, v]) => (
            <div key={k} className={styles.fact}>
              <span className={styles.factKey}>{k}</span>
              <span className={styles.factVal}>{v}</span>
            </div>
          ))}
        </div>

        <p className={styles.description}>{beer.description}</p>

        <div className={styles.compare}>
          <div className={styles.compareHead}>
            <span className={styles.h3}>{COPY.detail.compare}</span>
            <span className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: beer.color }} />
                {beer.name}
              </span>
              <span className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: 'var(--ink)', borderColor: 'var(--ink)' }} />
                {COPY.detail.you}
              </span>
            </span>
          </div>
          {DISPLAY_AXES.map((a) => (
            <div key={a.axis} className={styles.row}>
              <span className={styles.rowLabel}>{a.label}</span>
              <div className={styles.bars}>
                <div className={styles.track}>
                  <div className={`${styles.bar} ${styles.beerBar}`} style={{ width: `${beer.taste[a.axis]}%`, background: beer.color }} />
                </div>
                <div className={styles.track}>
                  <div className={styles.bar} style={{ width: `${dna.taste[a.axis]}%`, background: 'var(--ink)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.relation}>
          <span className={styles.h3}>{COPY.detail.relation}</span>
          <div className={styles.chips}>
            {RATINGS.map((r) => {
              const active = current === r
              return (
                <button
                  key={r}
                  type="button"
                  className={styles.relChip}
                  style={
                    active
                      ? { background: RATING_COLOR[r], borderColor: RATING_COLOR[r], color: 'var(--cream-fixed)' }
                      : undefined
                  }
                  onClick={() => setRelation(r)}
                  aria-pressed={active}
                >
                  {RATING_ICON[r]}
                  {COPY.rating[r].label}
                </button>
              )
            })}
          </div>
          <span className={styles.relQuip}>{relationQuip(current, beer)}</span>
        </div>
      </div>
    </div>
  )
}
