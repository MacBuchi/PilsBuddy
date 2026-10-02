import { ShareFatIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { COPY, fill } from '../../data/copy'
import { shareCardData } from '../../domain/shareCard'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { BuddyAvatar } from '../components/BuddyAvatar'
import { Button } from '../components/Button'
import page from './page.module.css'
import { renderShareCard, shareImage } from '../share/renderShareCard'
import styles from './AvatarScreen.module.css'

export function AvatarScreen() {
  const { go, toast, state } = useApp()
  const { archetype, avatar, decoded, dna, candidates } = useDerived()
  const P = COPY.personas[archetype]
  const [busy, setBusy] = useState(false)

  const share = async () => {
    const text = fill(COPY.avatar.shareText, { name: P.name, tagline: COPY.app.tagline })
    setBusy(true)
    try {
      const data = shareCardData(dna, archetype, avatar, state.profile.ratings, candidates.slice(0, 3))
      const blob = await renderShareCard(data, window.location.origin)
      const how = await shareImage(blob, `pilsbuddy-${archetype}.png`, `${fill(COPY.share.text, { name: P.name })} ${window.location.origin}`)
      if (how === 'downloaded') toast(COPY.share.downloaded)
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      // image path failed – fall back to a text share below
    } finally {
      setBusy(false)
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: COPY.app.name, text, url: window.location.origin })
        return
      }
      await navigator.clipboard.writeText(`${text} ${window.location.origin}`)
      toast(COPY.avatar.shared)
    } catch (e) {
      // user cancelled the share sheet – not an error worth a toast
      if (e instanceof DOMException && e.name === 'AbortError') return
      toast(COPY.avatar.shareFailed)
    }
  }

  return (
    <div className={`${page.page} ${styles.screen}`}>
      <div className={`t-label ${styles.in1}`} style={{ letterSpacing: '0.16em' }}>
        {COPY.avatar.youAre}
      </div>
      <h1 className={`${styles.name} ${styles.in2}`}>{P.name}</h1>
      <div className={styles.stage}>
        <div className={styles.sun} />
        <div className={styles.float}>
          <BuddyAvatar spec={avatar} size={200} />
        </div>
      </div>
      <p className={styles.desc}>{P.desc}</p>
      <div className={styles.traits}>
        {P.traits.map((t) => (
          <span key={t} className={page.chip}>
            {t}
          </span>
        ))}
      </div>
      <div className={styles.evo}>
        <div className={styles.evoAvatars}>
          <BuddyAvatar archetype={archetype} decoded={10} size={34} />
          <BuddyAvatar archetype={archetype} decoded={50} size={40} />
          <BuddyAvatar archetype={archetype} decoded={100} size={48} />
        </div>
        <span className={styles.evoText}>{decoded >= 70 ? COPY.avatar.evoFull : COPY.avatar.evoRaw}</span>
      </div>
      <div className={styles.actions}>
        <Button onClick={() => go('match')} style={{ flex: 1, height: 58, fontSize: 15 }}>
          {COPY.avatar.cta}
        </Button>
        <Button variant="icon" onClick={share} disabled={busy} aria-label={COPY.share.button} style={{ width: 58, height: 58, borderWidth: 2.5, fontSize: 22 }}>
          <ShareFatIcon weight="bold" />
        </Button>
      </div>
    </div>
  )
}
