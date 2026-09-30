import {
  BeerSteinIcon,
  BinocularsIcon,
  CrownIcon,
  DnaIcon,
  FireIcon,
  HandWavingIcon,
  HandshakeIcon,
  HeartIcon,
  MedalIcon,
  MoonStarsIcon,
  PackageIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { BEER_BY_ID } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import type { AchievementDef } from '../../domain/achievements'
import { progressMessage } from '../../domain/quips'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { BuddyAvatar } from '../components/BuddyAvatar'
import { RATING_COLOR, RATING_ICON } from '../ratingStyle'
import page from './page.module.css'
import { BottleArt } from '../components/BottleArt'
import styles from './Profile.module.css'

const ACH_ICON: Record<AchievementDef['icon'], ReactNode> = {
  heart: <HeartIcon weight="fill" />,
  crown: <CrownIcon weight="fill" />,
  binoculars: <BinocularsIcon weight="bold" />,
  'beer-stein': <BeerSteinIcon weight="fill" />,
  'hand-waving': <HandWavingIcon weight="bold" />,
  dna: <DnaIcon weight="bold" />,
  fire: <FireIcon weight="fill" />,
  medal: <MedalIcon weight="fill" />,
  package: <PackageIcon weight="bold" />,
  handshake: <HandshakeIcon weight="bold" />,
}

export function Profile() {
  const { state, dispatch, openDetail, withTabs } = useApp()
  const { counts, decoded, archetype, avatar, achievements } = useDerived()
  const { ratings, dark, buddyNo } = state.profile
  const P = COPY.personas[archetype]

  const history = Object.entries(ratings)
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id, e]) => ({ beer: BEER_BY_ID[id], rating: e.rating }))
    .filter((h) => h.beer)

  const stats = [
    { k: COPY.profile.stats.total, v: counts.total, col: 'var(--ink)' },
    { k: COPY.profile.stats.likes, v: counts.LIKE, col: RATING_COLOR.LIKE },
    { k: COPY.profile.stats.nopes, v: counts.DISLIKE, col: RATING_COLOR.DISLIKE },
    { k: COPY.profile.stats.tries, v: counts.WANT_TO_TRY, col: RATING_COLOR.WANT_TO_TRY },
  ]

  const reset = () => {
    if (window.confirm(COPY.profile.resetConfirm)) dispatch({ type: 'RESET' })
  }

  return (
    <div className={`${page.page} ${withTabs ? page.withTabs : ''}`} style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div className={styles.head}>
        <div className={styles.avatarRing}>
          <BuddyAvatar spec={avatar} size={92} />
        </div>
        <div className={styles.headText}>
          <span className="t-label">{fill(COPY.profile.buddyNo, { n: String(buddyNo).padStart(4, '0') })}</span>
          <span className={styles.persona}>{P.name}</span>
          <span className={styles.prog}>{progressMessage(decoded)}</span>
        </div>
      </div>

      <div className={styles.stats}>
        {stats.map((s) => (
          <div key={s.k} className={styles.stat}>
            <span className={styles.statVal} style={{ color: s.col }}>
              {s.v}
            </span>
            <span className={styles.statKey}>{s.k}</span>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.h2}>{COPY.profile.achievements}</h2>
        <div className={styles.achGrid}>
          {achievements.map((a) => (
            <div key={a.id} className={`${styles.ach} ${a.unlocked ? styles.achOn : ''}`} aria-label={`${a.title}: ${a.desc}${a.unlocked ? '' : ' (noch nicht)'}`}>
              <span className={styles.achIcon}>{ACH_ICON[a.icon]}</span>
              <span className={styles.achTitle}>{a.title}</span>
              <span className={styles.achDesc}>{a.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{COPY.profile.relations}</h2>
        {history.map(({ beer, rating }) => (
          <button key={beer.id} type="button" className={styles.rel} onClick={() => openDetail(beer.id)}>
            <BottleArt beer={beer} size={30} outline="var(--edge)" className={styles.relBottle} />
            <span className={styles.relName}>{beer.fullName}</span>
            <span className={styles.relRating} style={{ color: RATING_COLOR[rating] }}>
              {RATING_ICON[rating]}
              {COPY.rating[rating].label}
            </span>
          </button>
        ))}
        {history.length === 0 && <div className={page.dashed}>{COPY.profile.noRelations}</div>}
      </section>

      <section className={styles.section}>
        <button type="button" className={styles.setting} onClick={() => dispatch({ type: 'TOGGLE_DARK' })} role="switch" aria-checked={dark}>
          <MoonStarsIcon weight="bold" size={20} />
          <span className={styles.settingText}>
            <span className={styles.settingLabel}>{COPY.profile.dark}</span>
            <span className={styles.settingSub}>{COPY.profile.darkSub}</span>
          </span>
          <span className={`${styles.track} ${dark ? styles.trackOn : ''}`}>
            <span className={styles.knob} style={{ left: dark ? 22 : 2 }} />
          </span>
        </button>
        <button type="button" className={styles.reset} onClick={reset}>
          {COPY.profile.reset}
        </button>
      </section>
    </div>
  )
}
