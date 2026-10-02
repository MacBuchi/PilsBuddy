import { CardsIcon, DnaIcon, GameControllerIcon, HeartIcon, UserCircleIcon } from '@phosphor-icons/react'
import { COPY } from '../../data/copy'
import { TAB_SCREENS } from '../../state/reducer'
import { useApp } from '../../state/AppContext'
import styles from './TabBar.module.css'

const ICONS: Record<(typeof TAB_SCREENS)[number], typeof CardsIcon> = {
  swipe: CardsIcon,
  dna: DnaIcon,
  matches: HeartIcon,
  games: GameControllerIcon,
  profile: UserCircleIcon,
}

const TABS = TAB_SCREENS.map((screen) => ({ screen, label: COPY.tabs[screen], Icon: ICONS[screen] }))

export function TabBar() {
  const { state, go } = useApp()
  return (
    <nav className={styles.bar} aria-label={COPY.nav.main}>
      {TABS.map(({ screen, label, Icon }) => {
        const active = state.screen === screen
        return (
          <button
            key={screen}
            type="button"
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => go(screen)}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.pill}>
              <Icon weight={active ? 'fill' : 'bold'} />
            </span>
            <span className={styles.label}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
