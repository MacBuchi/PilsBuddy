import { useState } from 'react'
import { COPY } from '../../data/copy'
import { useApp } from '../../state/AppContext'
import { syncActions } from '../../sync/useCloudSync'
import { Button } from './Button'
import { Sheet } from './Sheet'
import styles from './SyncJoinSheet.module.css'

const errorText = (e: unknown) => {
  const kind = (e as { kind?: string }).kind
  return kind === 'code' ? COPY.sync.errors.code : kind === 'offline' ? COPY.sync.errors.offline : COPY.sync.errors.server
}

/** Enter a Sync-Code to put this device into an existing account (Profile and Welcome). */
export function SyncJoinSheet({ onClose, onJoined }: { onClose: () => void; onJoined?: () => void }) {
  const { state, dispatch, toast } = useApp()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (Object.keys(state.profile.ratings).length && !window.confirm(COPY.sync.joinConfirm)) return
    setBusy(true)
    setError(null)
    try {
      await syncActions.join(code, dispatch)
      toast(COPY.sync.joined)
      onClose()
      onJoined?.()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={COPY.sync.joinTitle} onClose={onClose}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <p className={styles.text}>{COPY.sync.joinText}</p>
        <input
          className={styles.input}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={COPY.sync.joinPlaceholder}
          aria-label={COPY.sync.joinTitle}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button block type="submit" disabled={busy || code.trim().length < 16}>
          {COPY.sync.joinCta}
        </Button>
      </form>
    </Sheet>
  )
}
