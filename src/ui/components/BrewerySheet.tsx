import { ArrowSquareOutIcon, NavigationArrowIcon, PlusCircleIcon } from '@phosphor-icons/react'
import { formatAbv, rememberRegional } from '../../data/beers'
import { COPY, fill, pick } from '../../data/copy'
import { hashId } from '../../domain/hash'
import { compatibility } from '../../domain/matching'
import { formatKm, routeUrl } from '../../domain/regional'
import { toRegionalBeer } from '../../domain/regionalBeer'
import type { RegionalBeerRow, RegionalBrewery } from '../../domain/regionalBeer'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { RATING_COLOR } from '../ratingStyle'
import { BeerBottle } from './BeerBottle'
import { Sheet } from './Sheet'
import list from '../screens/Matches.module.css'
import styles from './RegionalFinder.module.css'

interface Props {
  brewery: RegionalBrewery
  /** Distance from the user – null when the position is unknown (world map without „Mein Standort“). */
  km: number | null
  onClose: () => void
  /** „Bier fehlt? Eintragen“ for this brewery (R6). */
  onReport: (brewery: { id: string; name: string }) => void
}

/** A brewery with its main beers, route and „Probieren“ – opened from the finder list and from the world map. */
export function BrewerySheet({ brewery, km, onClose, onReport }: Props) {
  const { state, rate, toast, openDetail } = useApp()
  const { dna } = useDerived()
  const ratings = state.profile.ratings

  const show = (row: RegionalBeerRow) => openDetail(rememberRegional(row, brewery).id)
  const putOnList = (row: RegionalBeerRow) => {
    const beer = rememberRegional(row, brewery)
    if (rate(beer.id, 'WANT_TO_TRY').length) return
    toast(fill(pick(COPY.quips.WANT_TO_TRY, hashId(beer.id)), { name: beer.name }), RATING_COLOR.WANT_TO_TRY)
  }

  return (
    <Sheet title={brewery.name} onClose={onClose}>
      <div className={styles.sheetMeta}>
        {[brewery.city, km === null ? null : formatKm(km), brewery.founded ? fill(COPY.regional.since, { year: brewery.founded }) : null]
          .filter(Boolean)
          .join(' · ')}
      </div>
      <div className={styles.links}>
        <a className={styles.link} href={routeUrl(brewery)} target="_blank" rel="noopener noreferrer">
          <NavigationArrowIcon weight="bold" /> {COPY.regional.route}
        </a>
        {brewery.website && (
          <a className={styles.link} href={brewery.website} target="_blank" rel="noopener noreferrer">
            <ArrowSquareOutIcon weight="bold" /> {COPY.regional.website}
          </a>
        )}
      </div>
      <span className="t-label">{COPY.regional.sheetBeers}</span>
      {brewery.beers.length === 0 && <p className={styles.note}>{COPY.regional.sheetNone}</p>}
      {brewery.beers.map((row) => {
        const beer = toRegionalBeer(row, brewery)
        const onList = ratings[beer.id]?.rating === 'WANT_TO_TRY'
        return (
          <div key={row.id} className={styles.sheetBeer}>
            <button type="button" className={styles.sheetOpen} onClick={() => show(row)}>
              <span className={list.bottle} style={{ background: beer.color }}>
                <BeerBottle beer={beer} size={50} />
              </span>
              <span className={list.recoText}>
                <span className={`${list.recoName} ${styles.name}`}>{beer.name}</span>
                <span className={list.recoMeta}>
                  {beer.style} · {formatAbv(beer.abv)}
                </span>
                <span className={styles.sheetPct}>{fill(COPY.regional.match, { pct: compatibility(dna.taste, beer.taste) })}</span>
              </span>
            </button>
            <button
              type="button"
              className={`${styles.tryBtn} ${onList ? styles.tryOn : ''}`}
              onClick={() => putOnList(row)}
              disabled={onList}
            >
              {onList ? COPY.regional.onList : COPY.regional.tryCta}
            </button>
          </div>
        )
      })}
      <button type="button" className={styles.more} onClick={() => onReport({ id: brewery.id, name: brewery.name })}>
        <PlusCircleIcon weight="bold" /> {COPY.submit.entry}
      </button>
    </Sheet>
  )
}
