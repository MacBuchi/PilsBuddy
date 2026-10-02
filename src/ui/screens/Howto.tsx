import { ArrowLeftIcon, BeerBottleIcon, CheckIcon } from '@phosphor-icons/react'
import { COPY } from '../../data/copy'
import { useApp } from '../../state/AppContext'
import { Button } from '../components/Button'
import { GestureLegend } from '../components/GestureLegend'
import styles from './Howto.module.css'

export function Howto() {
  const { state, dispatch, go, toast } = useApp()
  const age = state.profile.ageConfirmed

  const start = () => {
    if (!age) {
      toast(COPY.howto.ageMissing)
      return
    }
    go('swipe')
  }

  return (
    <div className={styles.screen}>
      <Button variant="icon" aria-label={COPY.nav.back} onClick={() => go('welcome')}>
        <ArrowLeftIcon weight="bold" />
      </Button>

      <div className={styles.intro}>
        <div className="t-label">{COPY.howto.step}</div>
        <h1 className={styles.title}>{COPY.howto.title}</h1>
        <p className={styles.sub}>{COPY.howto.sub}</p>
      </div>

      <GestureLegend />

      <div className={styles.spacer} />

      <button
        type="button"
        className={styles.age}
        role="checkbox"
        aria-checked={age}
        onClick={() => dispatch({ type: 'SET_AGE', value: !age })}
      >
        <span className={styles.box} style={{ background: age ? 'var(--gold)' : 'transparent' }}>
          {age && <CheckIcon weight="bold" />}
        </span>
        <span className={styles.ageText}>
          <span className={styles.ageLabel}>{COPY.howto.age}</span>
          <span className={styles.ageSub}>{COPY.howto.ageSub}</span>
        </span>
      </button>

      <Button block onClick={start} style={{ opacity: age ? 1 : 0.45 }}>
        {COPY.howto.cta} <BeerBottleIcon weight="bold" />
      </Button>
    </div>
  )
}
