import { PlayIcon } from '@phosphor-icons/react'
import { BEER_BY_ID } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { useApp } from '../../state/AppContext'
import { BeerBottle } from '../components/BeerBottle'
import page from './page.module.css'
import styles from './Games.module.css'

const FAN = ['guinness', 'jever', 'paulaner-weisse'].map((id) => BEER_BY_ID[id]).filter(Boolean)

/** Stufe E: the mini games. Bier-Quartett is playable; the rest is announced. */
export function Games() {
  const { state, go, withTabs } = useApp()
  const { played, won } = state.profile.games.quartett

  return (
    <div className={`${page.page} ${withTabs ? page.withTabs : ''}`}>
      <div>
        <h1 className={page.h1}>{COPY.games.title}</h1>
        <p className={styles.sub}>{COPY.games.sub}</p>
      </div>

      <button type="button" className={styles.hero} onClick={() => go('quartett')}>
        <div className={styles.fan} aria-hidden>
          {FAN.map((b, i) => (
            <span key={b.id} className={styles.fanCard} style={{ background: b.color, ['--i' as string]: i - 1 }}>
              <BeerBottle beer={b} size={84} />
            </span>
          ))}
        </div>
        <span className={styles.heroTitle}>{COPY.games.quartett.title}</span>
        <span className={styles.heroText}>{COPY.games.quartett.text}</span>
        <span className={styles.heroFoot}>
          <span className={styles.record}>
            {played
              ? fill(COPY.games.quartett.record, {
                  won: String(won),
                  played: String(played),
                })
              : COPY.games.quartett.none}
          </span>
          <span className={styles.play}>
            <PlayIcon weight="fill" /> {COPY.games.quartett.cta}
          </span>
        </span>
      </button>

      <div className={styles.soonGrid}>
        {COPY.games.upcoming.map((g) => (
          <div key={g.title} className={styles.soon}>
            <span className={styles.soonChip}>{COPY.games.soon}</span>
            <span className={styles.soonTitle}>{g.title}</span>
            <span className={styles.soonText}>{g.text}</span>
          </div>
        ))}
      </div>

      <p className={styles.note}>{COPY.games.noDrinking}</p>
    </div>
  )
}
