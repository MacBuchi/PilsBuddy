import { ArrowLeftIcon } from '@phosphor-icons/react'
import { COPY } from '../../data/copy'
import { useApp } from '../../state/AppContext'
import { RegionalFinder } from '../components/RegionalFinder'
import page from './page.module.css'
import styles from './Legal.module.css'

/** Biere aus deiner Nähe (Stufe R4) – opened from the DNA screen; the same finder sits in Matches › Nähe. */
export function Regional() {
  const { go } = useApp()
  const back = () => go('dna')
  return (
    <div className={page.page}>
      <div className={styles.head}>
        <button type="button" className={styles.back} onClick={back} aria-label={COPY.legal.back}>
          <ArrowLeftIcon weight="bold" />
        </button>
        <h1 className={styles.title}>{COPY.regional.title}</h1>
      </div>
      <p className={styles.p}>{COPY.regional.intro}</p>
      <RegionalFinder />
    </div>
  )
}
