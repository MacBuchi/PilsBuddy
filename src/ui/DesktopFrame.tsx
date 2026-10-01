import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, CardsIcon, DnaIcon, GameControllerIcon, HeartIcon, UserCircleIcon } from '@phosphor-icons/react'
import { COPY } from '../data/copy'
import { DISPLAY_AXES } from '../domain/dna'
import { matchReason } from '../domain/matching'
import { TAB_SCREENS } from '../state/reducer'
import { useApp } from '../state/AppContext'
import { useDerived } from '../state/useDerived'
import { BuddyAvatar } from './components/BuddyAvatar'
import { BeerBottle } from './components/BeerBottle'
import styles from './DesktopFrame.module.css'

const ICONS = { swipe: CardsIcon, dna: DnaIcon, matches: HeartIcon, games: GameControllerIcon, profile: UserCircleIcon }

const KEYS = [
  { icon: <ArrowLeftIcon weight="bold" />, label: COPY.rating.DISLIKE.short },
  { icon: <ArrowRightIcon weight="bold" />, label: COPY.rating.LIKE.short },
  { icon: <ArrowUpIcon weight="bold" />, label: COPY.rating.WANT_TO_TRY.short },
  { icon: <ArrowDownIcon weight="bold" />, label: COPY.rating.UNKNOWN.short },
  { icon: <span className={styles.keyLetter}>K</span>, label: COPY.rating.KNOW.short },
]

/**
 * Desktop (≥ 1024 px, Designsystem §6): navigation on the left, the phone-sized
 * stage in the middle, live Bier-DNA on the right – every decision moves the bars.
 * Both columns are pure companions; the stage stays the single source of truth.
 */
export function DesktopLeft() {
  const { state, go } = useApp()
  const onboarded = state.profile.onboarded
  return (
    <aside className={styles.left}>
      <div className={styles.brand}>
        <BuddyAvatar archetype="logo" size={44} />
        <div className={styles.brandText}>
          <span className={styles.wordmark}>{COPY.app.name}</span>
          <span className="t-label" style={{ fontSize: 10 }}>
            Bier-Dating · v0.1
          </span>
        </div>
      </div>
      {onboarded && (
        <nav className={styles.nav} aria-label="Bereiche">
          {TAB_SCREENS.map((k) => {
            const Icon = ICONS[k]
            const active = state.screen === k
            return (
              <button key={k} type="button" className={`${styles.navItem} ${active ? styles.navActive : ''}`} onClick={() => go(k)}>
                <Icon weight={active ? 'fill' : 'bold'} />
                {COPY.tabs[k]}
              </button>
            )
          })}
        </nav>
      )}
      <div className={styles.box}>
        <span className="t-label">Steuerung</span>
        <div className={styles.keys}>
          {KEYS.map((k) => (
            <span key={k.label} className={styles.key}>
              <span className={styles.keyCap}>{k.icon}</span>
              {k.label}
            </span>
          ))}
        </div>
        <span className={styles.hint}>Karte ziehen oder Tasten. Tippen öffnet das Bier.</span>
      </div>
    </aside>
  )
}

export function DesktopRight() {
  const { state } = useApp()
  const { dna, archetype, avatar, candidates, counts } = useDerived()
  const top = candidates[0]
  const hasData = counts.total > 0
  const showTendency = state.profile.ageConfirmed
  if (!showTendency) return <aside className={styles.right} aria-hidden />
  return (
    <aside className={styles.right}>
      <div className={styles.box}>
        <div className={styles.tendency}>
          <div>
            <span className="t-label">Live-Tendenz</span>
            <div className={styles.persona}>{hasData ? COPY.personas[archetype].name : 'Noch keine Tendenz'}</div>
          </div>
          <BuddyAvatar spec={avatar} size={56} />
        </div>
        <div className={styles.bars}>
          {DISPLAY_AXES.map((a) => (
            <div key={a.axis} className={styles.bar}>
              <span className={styles.barLabel}>{a.label}</span>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${hasData ? dna.taste[a.axis] : 0}%`, background: a.color }} />
              </div>
              <span className={styles.barVal}>{hasData ? dna.taste[a.axis] : '–'}</span>
            </div>
          ))}
        </div>
      </div>
      {hasData && top && (
        <div className={styles.box}>
          <span className="t-label">{COPY.match.label}</span>
          <div className={styles.next}>
            <BeerBottle beer={top.beer} size={44} outline="var(--edge)" className={styles.nextBottle} />
            <div className={styles.nextText}>
              <span className={styles.nextName}>
                {top.beer.fullName} · {top.pct} %
              </span>
              <span className={styles.nextReason}>„{matchReason(dna.taste, top.beer)}“</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
