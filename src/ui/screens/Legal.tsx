import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { COPY, fill } from '../../data/copy'
import { LEGAL_UPDATED, OPERATOR, PRIVACY } from '../../data/legal'
import { useApp } from '../../state/AppContext'
import page from './page.module.css'
import styles from './Legal.module.css'

/** Impressum & Datenschutz (Stufe B4). Reachable from Welcome, Profile and via #impressum / #datenschutz. */
export default function Legal() {
  const { state, go } = useApp()
  const back = () => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
    go(state.prevScreen === 'legal' ? 'welcome' : state.prevScreen)
  }

  useEffect(() => {
    const anchor = window.location.hash.slice(1)
    if (anchor === 'datenschutz') document.getElementById('datenschutz')?.scrollIntoView()
  }, [])

  return (
    <div className={page.page}>
      <div className={styles.head}>
        <button type="button" className={styles.back} onClick={back} aria-label={COPY.legal.back}>
          <ArrowLeftIcon weight="bold" />
        </button>
        <h1 className={styles.title}>{COPY.legal.title}</h1>
      </div>

      <section className={styles.section} id="impressum">
        <h2 className={styles.h2}>{COPY.legal.imprint}</h2>
        {OPERATOR ? (
          <address className={styles.p}>
            {OPERATOR.name}
            {OPERATOR.address.map((line) => (
              <span key={line}>
                <br />
                {line}
              </span>
            ))}
            <br />
            {COPY.legal.contact}: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
          </address>
        ) : (
          <p className={styles.p}>{COPY.legal.imprintMissing}</p>
        )}
      </section>

      <section className={styles.section} id="datenschutz">
        <h2 className={styles.h2}>{COPY.legal.privacy}</h2>
        {PRIVACY.map((s) => (
          <div key={s.title} className={styles.block}>
            <h3 className={styles.h3}>{s.title}</h3>
            {s.paragraphs.map((t, i) => (
              <p key={i} className={styles.p}>
                {t}
              </p>
            ))}
          </div>
        ))}
        <p className={styles.updated}>{fill(COPY.legal.updated, { date: LEGAL_UPDATED })}</p>
      </section>
    </div>
  )
}
