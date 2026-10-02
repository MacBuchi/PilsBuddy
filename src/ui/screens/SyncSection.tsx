import { ArrowsClockwiseIcon, CopyIcon, KeyIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { COPY, fill } from '../../data/copy'
import { useApp } from '../../state/AppContext'
import { syncActions, useSyncStatus } from '../../sync/useCloudSync'
import { SyncJoinSheet } from '../components/SyncJoinSheet'
import styles from './Profile.module.css'

const time = (at: number) => new Date(at).toLocaleTimeString(COPY.app.locale, { hour: '2-digit', minute: '2-digit' })

/** Profile › „Auf allen Geräten“: opt-in switch, the Sync-Code, joining another device's account. */
export function SyncSection() {
  const { state, dispatch, toast } = useApp()
  const { on, code } = state.profile.sync
  const status = useSyncStatus()
  const [joining, setJoining] = useState(false)

  const line =
    status.state === 'ok' && status.lastAt ? fill(COPY.sync.status.ok, { time: time(status.lastAt) }) : COPY.sync.status[on ? status.state : 'off']

  const copyCode = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      toast(COPY.sync.copied)
    } catch {
      /* no clipboard (http, old browser) – the code is selectable */
    }
  }

  const erase = async () => {
    if (!window.confirm(COPY.sync.eraseConfirm)) return
    try {
      await syncActions.erase(code, dispatch)
      toast(COPY.sync.erased)
    } catch (e) {
      toast((e as { kind?: string }).kind === 'offline' ? COPY.sync.errors.offline : COPY.sync.errors.server)
    }
  }

  const renew = async () => {
    if (!window.confirm(COPY.sync.renewConfirm)) return
    try {
      await syncActions.renew(dispatch)
      toast(COPY.sync.renewed)
    } catch {
      toast(COPY.sync.errors.server)
    }
  }

  return (
    <>
      <h2 className={styles.h2}>{COPY.sync.title}</h2>
      <button
        type="button"
        className={styles.setting}
        role="switch"
        aria-checked={on}
        onClick={() => (on ? syncActions.disable(dispatch) : syncActions.enable(dispatch))}
      >
        <ArrowsClockwiseIcon weight="bold" size={20} />
        <span className={styles.settingText}>
          <span className={styles.settingLabel}>{COPY.sync.label}</span>
          <span className={styles.settingSub}>{on ? line : status.state === 'gone' ? COPY.sync.status.gone : COPY.sync.sub}</span>
        </span>
        <span className={`${styles.track} ${on ? styles.trackOn : ''}`}>
          <span className={styles.knob} style={{ left: on ? 22 : 2 }} />
        </span>
      </button>

      {on && (
        <div className={styles.syncCode}>
          <span className="t-label">{COPY.sync.codeLabel}</span>
          <div className={styles.codeRow}>
            <code className={styles.code} data-testid="sync-code">
              {code ?? COPY.sync.codePending}
            </code>
            {code && (
              <button type="button" className={styles.codeBtn} onClick={copyCode} aria-label={COPY.sync.copy}>
                <CopyIcon weight="bold" size={18} />
              </button>
            )}
          </div>
          <span className={styles.settingSub}>{COPY.sync.codeHint}</span>
          {code && (
            <button type="button" className={styles.linkBtn} onClick={renew}>
              {COPY.sync.renew}
            </button>
          )}
        </div>
      )}
      {/* switching sync off keeps the cloud copy – this removes it (B4) */}
      {code && (
        <button type="button" className={`${styles.linkBtn} ${styles.eraseBtn}`} onClick={erase}>
          {COPY.sync.erase}
        </button>
      )}

      <button type="button" className={styles.setting} onClick={() => setJoining(true)}>
        <KeyIcon weight="bold" size={20} />
        <span className={styles.settingText}>
          <span className={styles.settingLabel}>{COPY.sync.join}</span>
          <span className={styles.settingSub}>{COPY.sync.joinSub}</span>
        </span>
      </button>
      {joining && <SyncJoinSheet onClose={() => setJoining(false)} />}
    </>
  )
}
