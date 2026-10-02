import { ChatCircleTextIcon, DownloadSimpleIcon, MoonStarsIcon, TranslateIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { serializeProfile } from '../../state/storage'
import { useProfileImport } from '../useProfileImport'
import { BEER_BY_ID } from '../../data/beers'
import { forgetSubmissions } from '../../data/beerSubmission'
import { forgetRegional } from '../../data/regional'
import { COPY, fill } from '../../data/copy'
import { progressMessage } from '../../domain/quips'
import { useApp } from '../../state/AppContext'
import { LANG, switchLang } from '../../state/lang'
import { useDerived } from '../../state/useDerived'
import { BuddyAvatar } from '../components/BuddyAvatar'
import { FeedbackSheet } from '../components/FeedbackSheet'
import { RATING_COLOR, RATING_ICON } from '../ratingStyle'
import page from './page.module.css'
import { BeerBottle } from '../components/BeerBottle'
import { ACH_ICON } from '../achievementIcons'
import styles from './Profile.module.css'
import { SyncSection } from './SyncSection'
import { hasCloudAccount, syncActions } from '../../sync/useCloudSync'

export function Profile() {
  const [feedback, setFeedback] = useState(false)
  const { state, dispatch, go, openDetail, withTabs, toast } = useApp()
  const { counts, decoded, archetype, avatar, achievements } = useDerived()
  const { ratings, dark, buddyNo } = state.profile
  const P = COPY.personas[archetype]

  const history = Object.entries(ratings)
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id, e]) => ({ beer: BEER_BY_ID[id], rating: e.rating }))
    .filter((h) => h.beer)

  const stats = [
    { k: COPY.profile.stats.total, v: counts.total, col: 'var(--ink)' },
    { k: COPY.profile.stats.likes, v: counts.LIKE, col: RATING_COLOR.LIKE },
    { k: COPY.profile.stats.nopes, v: counts.DISLIKE, col: RATING_COLOR.DISLIKE },
    { k: COPY.profile.stats.tries, v: counts.WANT_TO_TRY, col: RATING_COLOR.WANT_TO_TRY },
  ]

  const importer = useProfileImport()

  const exportProfile = () => {
    const blob = new Blob([serializeProfile(state.profile)], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `pilsbuddy-profil-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 10_000)
    toast(COPY.profile.exported)
  }

  const reset = async () => {
    const cloudAccount = hasCloudAccount(state.profile.sync)
    if (!window.confirm(cloudAccount ? COPY.profile.resetConfirmCloud : COPY.profile.resetConfirm)) return
    if (cloudAccount) {
      // „alles vergessen“ includes the server: delete the account first, keep everything if that fails
      try {
        await syncActions.erase(state.profile.sync.code, dispatch)
      } catch {
        toast(COPY.profile.resetFailed)
        return
      }
    }
    forgetRegional()
    forgetSubmissions()
    dispatch({ type: 'RESET' })
  }

  return (
    <div className={`${page.page} ${withTabs ? page.withTabs : ''}`} style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div className={styles.head}>
        <div className={styles.avatarRing}>
          <BuddyAvatar spec={avatar} size={92} />
        </div>
        <div className={styles.headText}>
          <span className="t-label">{fill(COPY.profile.buddyNo, { n: String(buddyNo).padStart(4, '0') })}</span>
          <span className={styles.persona}>{P.name}</span>
          <span className={styles.prog}>{progressMessage(decoded)}</span>
        </div>
      </div>

      <div className={styles.stats}>
        {stats.map((s) => (
          <div key={s.k} className={styles.stat}>
            <span className={styles.statVal} style={{ color: s.col }}>
              {s.v}
            </span>
            <span className={styles.statKey}>{s.k}</span>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.h2}>{COPY.profile.achievements}</h2>
        <div className={styles.achGrid}>
          {achievements.map((a) => (
            <div key={a.id} className={`${styles.ach} ${a.unlocked ? styles.achOn : ''}`} aria-label={`${a.title}: ${a.desc}${a.unlocked ? '' : COPY.profile.achLocked}`}>
              <span className={styles.achIcon}>{ACH_ICON[a.icon]}</span>
              <span className={styles.achTitle}>{a.title}</span>
              <span className={styles.achDesc}>{a.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{COPY.profile.relations}</h2>
        {history.map(({ beer, rating }) => (
          <button key={beer.id} type="button" className={styles.rel} onClick={() => openDetail(beer.id)}>
            <BeerBottle beer={beer} size={30} className={styles.relBottle} />
            <span className={styles.relName}>{beer.fullName}</span>
            <span className={styles.relRating} style={{ color: RATING_COLOR[rating] }}>
              {RATING_ICON[rating]}
              {COPY.rating[rating].label}
            </span>
          </button>
        ))}
        {history.length === 0 && <div className={page.dashed}>{COPY.profile.noRelations}</div>}
      </section>

      <section className={styles.section}>
        <button type="button" className={styles.setting} onClick={() => dispatch({ type: 'TOGGLE_DARK' })} role="switch" aria-checked={dark}>
          <MoonStarsIcon weight="bold" size={20} />
          <span className={styles.settingText}>
            <span className={styles.settingLabel}>{COPY.profile.dark}</span>
            <span className={styles.settingSub}>{COPY.profile.darkSub}</span>
          </span>
          <span className={`${styles.track} ${dark ? styles.trackOn : ''}`}>
            <span className={styles.knob} style={{ left: dark ? 22 : 2 }} />
          </span>
        </button>
        <button type="button" className={styles.setting} onClick={() => switchLang(LANG === 'de' ? 'en' : 'de')} lang={LANG}>
          <TranslateIcon weight="bold" size={20} />
          <span className={styles.settingText}>
            <span className={styles.settingLabel}>{COPY.language.label}</span>
            <span className={styles.settingSub}>{COPY.language.sub}</span>
          </span>
          <span className={styles.langCode}>{COPY.language.code}</span>
        </button>
        <SyncSection />
        <button type="button" className={styles.setting} onClick={() => setFeedback(true)}>
          <ChatCircleTextIcon weight="bold" size={20} />
          <span className={styles.settingText}>
            <span className={styles.settingLabel}>{COPY.feedback.entry}</span>
            <span className={styles.settingSub}>{COPY.feedback.entrySub}</span>
          </span>
        </button>
        {feedback && <FeedbackSheet onClose={() => setFeedback(false)} />}
        <h2 className={styles.h2}>{COPY.profile.backup}</h2>
        <button type="button" className={styles.setting} onClick={exportProfile}>
          <DownloadSimpleIcon weight="bold" size={20} />
          <span className={styles.settingText}>
            <span className={styles.settingLabel}>{COPY.profile.exportLabel}</span>
            <span className={styles.settingSub}>{COPY.profile.exportSub}</span>
          </span>
        </button>
        <button type="button" className={styles.setting} onClick={importer.open}>
          <UploadSimpleIcon weight="bold" size={20} />
          <span className={styles.settingText}>
            <span className={styles.settingLabel}>{COPY.profile.importLabel}</span>
            <span className={styles.settingSub}>{COPY.profile.importSub}</span>
          </span>
        </button>
        {importer.input}
        <button type="button" className={styles.reset} onClick={reset}>
          {COPY.profile.reset}
        </button>
        <button type="button" className={styles.legalLink} onClick={() => go('legal')}>
          {COPY.profile.legal}
        </button>
        <p className={styles.version}>{COPY.profile.version.replace('{version}', __APP_VERSION__)}</p>
      </section>
    </div>
  )
}
