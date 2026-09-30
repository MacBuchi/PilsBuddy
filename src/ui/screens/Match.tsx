import { HeartIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { COPY, fill } from '../../data/copy'
import { matchReason } from '../../domain/matching'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { BuddyAvatar } from '../components/BuddyAvatar'
import { Button } from '../components/Button'
import styles from './Match.module.css'

const CONFETTI = Array.from({ length: 12 }, (_, i) => ({
  x: ((5 + i * 8.3) % 95) + '%',
  y: (8 + ((i * 37) % 80)) + '%',
  s: 6 + ((i * 5) % 9),
  c: ['#F2B53A', '#E5534B', '#FFF6E3', '#6DBE5A'][i % 4],
  d: (3 + (i % 3)) + 's',
}))

const COUNT_MS = 1100

export function Match() {
  const { go, openDetail } = useApp()
  const { avatar, candidates, dna } = useDerived()
  const top = candidates[0]
  const [shown, setShown] = useState(0)

  // count up with ease-out cubic (Designsystem §5)
  useEffect(() => {
    if (!top) return
    const t0 = performance.now()
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / COUNT_MS)
      setShown(Math.round(top.pct * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) clearInterval(id)
    }, 30)
    return () => clearInterval(id)
  }, [top])

  if (!top) return null
  const beer = top.beer

  return (
    <div className={styles.screen}>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className={styles.confetti}
          style={{ left: c.x, top: c.y, width: c.s, height: c.s, background: c.c, animationDuration: c.d }}
        />
      ))}
      <div className={styles.label}>{COPY.match.label}</div>
      <div className={styles.pair}>
        <div className={styles.you}>
          <BuddyAvatar spec={avatar} size={118} />
        </div>
        <div className={styles.beer} style={{ background: beer.color }}>
          <div className={styles.foam} />
          <div className={styles.scallop} />
          {beer.image ? (
            <img className={styles.bottle} src={beer.image} alt="" />
          ) : (
            <div className={styles.placeholder} />
          )}
        </div>
        <div className={styles.heart}>
          <HeartIcon weight="fill" />
        </div>
      </div>
      <div className={styles.names}>{fill(COPY.match.you, { name: beer.name })}</div>
      <div className={styles.pct}>{shown} %</div>
      <div className={styles.compat}>{COPY.match.compat}</div>
      <p className={styles.reason}>„{matchReason(dna.taste, beer)}“</p>
      <div style={{ flex: 1 }} />
      <Button block onClick={() => openDetail(beer.id)} style={{ border: 0, boxShadow: '0 5px 0 var(--gold-shadow)' }}>
        {COPY.match.cta}
      </Button>
      <Button variant="ghost-light" block size="md" onClick={() => go('swipe')} style={{ height: 52 }}>
        {COPY.match.continue}
      </Button>
    </div>
  )
}
