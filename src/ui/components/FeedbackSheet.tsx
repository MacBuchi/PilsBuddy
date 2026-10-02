import { useEffect, useState } from 'react'
import { COPY } from '../../data/copy'
import { FEEDBACK_MAX, readDraft, sendFeedback, validFeedback, writeDraft } from '../../data/feedback'
import type { FeedbackType, SendResult } from '../../data/feedback'
import { Button } from './Button'
import { Sheet } from './Sheet'
import styles from './FeedbackSheet.module.css'

const PROBLEM: Partial<Record<SendResult, string>> = {
  invalid: COPY.feedback.tooShort,
  duplicate: COPY.feedback.duplicate,
  busy: COPY.feedback.busy,
  offline: COPY.feedback.offline,
}

/**
 * „Wünsch dir was!“ – idea or bug, one text field. Self-contained (no app context), so the error screen
 * can open it too. The draft is kept on the device until it was sent.
 */
export function FeedbackSheet({ onClose, initialType }: { onClose: () => void; initialType?: FeedbackType }) {
  const [draft, setDraft] = useState(() => {
    const d = readDraft()
    return initialType ? { ...d, type: initialType } : d
  })
  const [state, setState] = useState<'edit' | 'sending' | 'sent'>('edit')
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (state === 'edit') writeDraft(draft)
  }, [draft, state])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validFeedback(draft.message)) return setProblem(COPY.feedback.tooShort)
    setState('sending')
    setProblem(null)
    const result = await sendFeedback(draft.type, draft.message)
    if (result === 'ok' || result === 'duplicate') {
      writeDraft({ ...draft, message: '' })
      setState('sent')
      return
    }
    setState('edit')
    setProblem(PROBLEM[result] ?? COPY.feedback.offline)
  }

  if (state === 'sent') {
    return (
      <Sheet title={COPY.feedback.thanks} onClose={onClose}>
        <p className={styles.intro}>{COPY.feedback.thanksSub}</p>
        <Button block size="md" onClick={onClose}>
          {COPY.feedback.close}
        </Button>
      </Sheet>
    )
  }

  const bug = draft.type === 'bug'
  return (
    <Sheet title={COPY.feedback.title} onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.types} role="radiogroup" aria-label={COPY.feedback.title}>
          {(['feature', 'bug'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={draft.type === t}
              className={`${styles.type} ${draft.type === t ? styles.typeOn : ''}`}
              onClick={() => setDraft((d) => ({ ...d, type: t }))}
            >
              {COPY.feedback[t]}
            </button>
          ))}
        </div>
        <p className={styles.intro}>{bug ? COPY.feedback.introBug : COPY.feedback.introFeature}</p>
        <textarea
          className={styles.text}
          rows={5}
          maxLength={FEEDBACK_MAX}
          autoCapitalize="sentences"
          placeholder={bug ? COPY.feedback.placeholderBug : COPY.feedback.placeholderFeature}
          aria-label={COPY.feedback.label}
          value={draft.message}
          onChange={(e) => {
            setProblem(null)
            setDraft((d) => ({ ...d, message: e.target.value }))
          }}
        />
        <div className={styles.count}>
          {draft.message.trim().length} / {FEEDBACK_MAX}
        </div>
        {problem && (
          <p className={styles.problem} role="status">
            {problem}
          </p>
        )}
        <p className={styles.privacy}>{COPY.feedback.privacy}</p>
        <Button type="submit" block size="md" disabled={state === 'sending'}>
          {state === 'sending' ? COPY.feedback.sending : COPY.feedback.send}
        </Button>
      </form>
    </Sheet>
  )
}
