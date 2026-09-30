import { useEffect, useState } from 'react'
import { COPY } from '../../data/copy'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { BuddyAvatar } from '../components/BuddyAvatar'
import styles from './Analyzing.module.css'

export const ANALYZE_MS = 2900
const LINE_MS = 700

/** Theatrical pause before the DNA reveal. The maths is instant; the suspense is the product. */
export function Analyzing() {
  const { go } = useApp()
  const { archetype } = useDerived()
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const lines = setInterval(() => setIdx((i) => (i + 1) % COPY.loading.lines.length), LINE_MS)
    const done = setTimeout(() => go('dna'), ANALYZE_MS)
    return () => {
      clearInterval(lines)
      clearTimeout(done)
    }
  }, [go])

  return (
    <div className={styles.screen}>
      <div className={styles.orb}>
        <div className={styles.ring} />
        <div className={styles.disc} />
        <div className={styles.bob}>
          <BuddyAvatar archetype={archetype} decoded={0} size={150} />
        </div>
      </div>
      <div className="t-label" style={{ letterSpacing: '0.14em' }}>
        {COPY.loading.label}
      </div>
      <div className={styles.line} aria-live="polite">
        {COPY.loading.lines[idx]}
      </div>
      <div className={styles.bar}>
        <div className={styles.slider} />
      </div>
    </div>
  )
}
