import { ArrowLeftIcon } from '@phosphor-icons/react'
import { COPY } from '../../data/copy'
import { useApp } from '../../state/AppContext'
import page from './page.module.css'
import styles from './Legal.module.css'

/** Shown when the legal chunk can't be loaded (offline before it was ever opened). */
export default function LegalOffline() {
  const { state, go } = useApp()
  return (
    <div className={page.page}>
      <div className={styles.head}>
        <button type="button" className={styles.back} onClick={() => go(state.prevScreen === 'legal' ? 'welcome' : state.prevScreen)} aria-label={COPY.legal.back}>
          <ArrowLeftIcon weight="bold" />
        </button>
        <h1 className={styles.title}>{COPY.legal.title}</h1>
      </div>
      <p className={styles.p}>{COPY.legal.offline}</p>
    </div>
  )
}
