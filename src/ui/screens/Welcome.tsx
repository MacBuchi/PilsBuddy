import { ArrowRightIcon } from '@phosphor-icons/react'
import { COPY, fill } from '../../data/copy'
import { useApp } from '../../state/AppContext'
import { BuddyAvatar } from '../components/BuddyAvatar'
import { Button } from '../components/Button'
import { useState } from 'react'
import { SyncJoinSheet } from '../components/SyncJoinSheet'
import { useProfileImport } from '../useProfileImport'
import styles from './Welcome.module.css'

const BUBBLES = Array.from({ length: 9 }, (_, i) => ({
  x: ((8 + i * 11) % 92) + '%',
  s: 8 + ((i * 7) % 16),
  d: (6 + (i % 4) * 1.7).toFixed(1) + 's',
  dl: (i * 0.9).toFixed(1) + 's',
}))

export function Welcome() {
  const { go, state } = useApp()
  const buddy = state.profile.buddy
  const importer = useProfileImport((p) => go(p.ageConfirmed ? 'swipe' : 'howto'))
  const [joining, setJoining] = useState(false)
  return (
    <div className={styles.screen}>
      <div className={styles.foam} />
      <div className={styles.scallop} />
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className={styles.bubble}
          style={{ left: b.x, width: b.s, height: b.s, animationDuration: b.d, animationDelay: b.dl }}
        />
      ))}
      <div className={styles.hero}>
        <div className={styles.float}>
          <BuddyAvatar archetype="logo" size={190} />
        </div>
        <h1 className={styles.title}>{COPY.app.name}</h1>
        <p className={styles.tagline}>{COPY.app.tagline}</p>
      </div>
      <div className={styles.footer}>
        {buddy && (
          <p className={styles.invite}>{fill(COPY.buddy.welcome, { no: String(buddy.no).padStart(4, '0') })}</p>
        )}
        <Button variant="ink" block onClick={() => go('howto')}>
          {COPY.welcome.cta} <ArrowRightIcon weight="bold" />
        </Button>
        <p className={styles.promise}>{COPY.welcome.promise}</p>
        <button type="button" className={styles.restore} onClick={importer.open}>
          {COPY.welcome.restore}
        </button>
        {importer.input}
        <button type="button" className={styles.restore} onClick={() => setJoining(true)}>
          {COPY.sync.join}
        </button>
        {joining && <SyncJoinSheet onClose={() => setJoining(false)} onJoined={() => go('howto')} />}
      </div>
    </div>
  )
}
