import { ArrowRightIcon, DropIcon, FireIcon, GrainsIcon, LeafIcon, MagnifyingGlassIcon, PlantIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { COPY, fill } from '../../data/copy'
import { DISPLAY_AXES, dominantDisplayAxis } from '../../domain/dna'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { Button } from '../components/Button'
import page from './page.module.css'
import styles from './Dna.module.css'

const AXIS_ICON = [LeafIcon, PlantIcon, GrainsIcon, DropIcon, FireIcon]

/** iOS Safari outside the home-screen app: the only place that needs a manual install hint. */
const IOS_BROWSER =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/.test(navigator.userAgent) &&
  !(navigator as Navigator & { standalone?: boolean }).standalone
export const INSTALL_HINT_ID = 'hint-ios-install'

export function Dna() {
  const { go, withTabs, state, dispatch } = useApp()
  const showInstall = IOS_BROWSER && !state.profile.seen.includes(INSTALL_HINT_ID)
  const { dna, counts, decoded } = useDerived()
  const [barsIn, setBarsIn] = useState(false)

  // bars fill 1 s after mount, 90 ms staggered (Designsystem §5 "Reveals")
  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 80)
    return () => clearTimeout(t)
  }, [])

  const longMsg = decoded >= 100 ? COPY.dna.longFull : decoded >= 70 ? COPY.dna.longAlmost : COPY.dna.longStart
  const quip =
    counts.DISLIKE >= 5
      ? fill(COPY.dna.nopeQuip, { n: counts.DISLIKE })
      : counts.UNKNOWN >= 4
        ? fill(COPY.dna.unknownQuip, { n: counts.UNKNOWN })
        : COPY.dna.axisQuips[dominantDisplayAxis(dna.taste)]
  const cur = dna.curiosity
  const curLabel = cur > 60 ? COPY.dna.curiosityHigh : cur > 35 ? COPY.dna.curiosityMid : COPY.dna.curiosityLow

  return (
    <div className={`${page.page} ${withTabs ? page.withTabs : ''}`}>
      <div className={styles.head}>
        <div className="t-label" style={{ letterSpacing: '0.14em' }}>
          {COPY.dna.label}
        </div>
        <h1 className={styles.title}>{fill(COPY.dna.title, { pct: decoded })}</h1>
        <p className={styles.sub}>{longMsg}</p>
      </div>

      {state.profile.buddy && (
        <button
          type="button"
          className={styles.buddyCard}
          onClick={() => {
            dispatch({ type: 'SET_MATCH_TAB', tab: 'menschen' })
            go('matches')
          }}
        >
          <span>{fill(COPY.buddy.title, { no: String(state.profile.buddy.no).padStart(4, '0') })}</span>
          <b>{COPY.buddy.dnaCta} →</b>
        </button>
      )}

      <button type="button" className={styles.buddyCard} onClick={() => go('regional')}>
        <span>{COPY.regional.dnaCta}</span>
        <b>{COPY.regional.dnaCtaGo} →</b>
      </button>

      {showInstall && (
        <div className={styles.install} role="note">
          <span className={styles.installText}>
            <b>{COPY.installHint.title}</b>
            <span>{COPY.installHint.text}</span>
          </span>
          <button type="button" className={styles.installClose} onClick={() => dispatch({ type: 'MARK_SEEN', id: INSTALL_HINT_ID })}>
            {COPY.installHint.close}
          </button>
        </div>
      )}

      <div className={page.panel}>
        {DISPLAY_AXES.map((a, i) => {
          const pct = dna.taste[a.axis]
          const Icon = AXIS_ICON[i]
          return (
            <div key={a.axis} className={styles.axis}>
              <div className={styles.axisRow}>
                <span className={styles.axisIcon} style={{ background: a.color }}>
                  <Icon weight="bold" />
                </span>
                <span className={styles.axisLabel}>{a.label}</span>
                <span className={styles.axisPct}>{pct} %</span>
              </div>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{ width: barsIn ? `${pct}%` : '0%', background: a.color, transitionDelay: `${i * 90}ms` }}
                />
              </div>
            </div>
          )
        })}
        <div className={styles.curiosity}>
          <span className="t-label">{COPY.dna.curiosity}</span>
          <span className={styles.curiosityVal}>
            {cur} % · {curLabel}
          </span>
        </div>
      </div>

      <div className={styles.notable}>
        <MagnifyingGlassIcon weight="bold" size={22} style={{ marginTop: 2, flex: 'none' }} />
        <div className={styles.notableText}>
          <span className={styles.notableLabel}>{COPY.dna.notable}</span>
          <span className={styles.notableQuip}>{quip}</span>
        </div>
      </div>

      <Button variant="ink" block onClick={() => go('avatar')} style={{ flex: 'none', fontSize: 16, boxShadow: '0 5px 0 var(--gold)' }}>
        {COPY.dna.cta} <ArrowRightIcon weight="bold" />
      </Button>
    </div>
  )
}
