import { useEffect } from 'react'
import { COPY } from '../../data/copy'
import type { AchievementDef } from '../../domain/achievements'
import type { AvatarSpec } from '../../domain/avatar'
import { ACH_ICON } from '../achievementIcons'
import { BuddyAvatar } from './BuddyAvatar'
import { Button } from './Button'
import styles from './MomentOverlay.module.css'

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  x: ((7 + i * 7.1) % 94) + '%',
  y: (6 + ((i * 41) % 84)) + '%',
  s: 6 + ((i * 5) % 9),
  c: ['#F2B53A', '#E5534B', '#FFF6E3', '#6DBE5A'][i % 4],
  d: 3 + (i % 3) + 's',
}))

interface Props {
  achievement: AchievementDef
  avatar: AvatarSpec
  onClose: () => void
  /** Only for the DNA moment: open the DNA (or its analysis during onboarding). */
  onDna?: () => void
}

/** One-time full-screen celebration for big achievements (Designsystem: pbPop + confetti). */
export function MomentOverlay({ achievement, avatar, onClose, onDna }: Props) {
  const dna = achievement.id === 'entschluesselt'
  const sticker = avatar.stickers.includes(achievement.id as AvatarSpec['stickers'][number])

  // swallow keys so the deck behind doesn't swipe; Enter/Escape close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={achievement.title}>
      {CONFETTI.map((c, i) => (
        <span key={i} className={styles.confetti} style={{ left: c.x, top: c.y, width: c.s, height: c.s, background: c.c, animationDuration: c.d }} />
      ))}
      <div className={styles.label}>{COPY.moment.label}</div>
      {dna ? (
        <div className={styles.pop}>
          <BuddyAvatar spec={avatar} size={170} />
        </div>
      ) : (
        <div className={`${styles.pop} ${styles.medal}`}>{ACH_ICON[achievement.icon]}</div>
      )}
      <h2 className={styles.title}>{dna ? COPY.moment.dnaTitle : achievement.title}</h2>
      <p className={styles.sub}>{dna ? COPY.moment.dnaSub : achievement.desc}</p>
      {sticker && !dna && (
        <div className={styles.stickerRow}>
          <BuddyAvatar spec={avatar} size={64} />
          <span>{COPY.moment.sticker}</span>
        </div>
      )}
      <div className={styles.actions}>
        {dna && onDna ? (
          <>
            <Button block onClick={onDna}>
              {COPY.moment.dnaCta}
            </Button>
            <Button block variant="ghost-light" onClick={onClose}>
              {COPY.moment.later}
            </Button>
          </>
        ) : (
          <Button block onClick={onClose} autoFocus>
            {COPY.moment.cta}
          </Button>
        )}
      </div>
    </div>
  )
}
