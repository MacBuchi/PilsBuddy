import { useState } from 'react'
import { COPY, fill } from '../../data/copy'
import { BEER_PROBLEMS, FEEDBACK_MAX, sendBeerProblem, validBeerProblem } from '../../data/feedback'
import type { BeerProblem, SendResult } from '../../data/feedback'
import { Button } from './Button'
import { Sheet } from './Sheet'
import styles from './FeedbackSheet.module.css'

const PROBLEM: Partial<Record<SendResult, string>> = {
  invalid: COPY.beerProblem.needNote,
  busy: COPY.feedback.busy,
  offline: COPY.feedback.offline,
}

/** V2 – „Problem melden“ at a beer: what is wrong (one choice), an optional note; anonymous like feedback. */
export function BeerProblemSheet({ beer, onClose }: { beer: { id: string; name: string }; onClose: () => void }) {
  const [problem, setProblem] = useState<BeerProblem | null>(null)
  const [note, setNote] = useState('')
  const [state, setState] = useState<'edit' | 'sending' | 'sent'>('edit')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!problem) return setError(COPY.beerProblem.pick)
    if (!validBeerProblem(problem, note)) return setError(COPY.beerProblem.needNote)
    setState('sending')
    setError(null)
    const result = await sendBeerProblem(beer, problem, COPY.beerProblem.problems[problem], note)
    if (result === 'ok' || result === 'duplicate') return setState('sent')
    setState('edit')
    setError(PROBLEM[result] ?? COPY.feedback.offline)
  }

  if (state === 'sent') {
    return (
      <Sheet title={COPY.beerProblem.thanks} onClose={onClose}>
        <p className={styles.intro}>{COPY.beerProblem.thanksSub}</p>
        <Button block size="md" onClick={onClose}>
          {COPY.feedback.close}
        </Button>
      </Sheet>
    )
  }

  return (
    <Sheet title={COPY.beerProblem.title} onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        <p className={styles.intro}>{fill(COPY.beerProblem.intro, { name: beer.name })}</p>
        <div className={styles.choices} role="radiogroup" aria-label={COPY.beerProblem.title}>
          {BEER_PROBLEMS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={problem === p}
              className={`${styles.choice} ${problem === p ? styles.typeOn : ''}`}
              onClick={() => {
                setError(null)
                setProblem(p)
              }}
            >
              {COPY.beerProblem.problems[p]}
            </button>
          ))}
        </div>
        <textarea
          className={styles.text}
          rows={3}
          maxLength={FEEDBACK_MAX - 260}
          autoCapitalize="sentences"
          placeholder={problem === 'other' ? COPY.beerProblem.placeholderOther : COPY.beerProblem.placeholder}
          aria-label={COPY.beerProblem.label}
          value={note}
          onChange={(e) => {
            setError(null)
            setNote(e.target.value)
          }}
        />
        {error && (
          <p className={styles.problem} role="status">
            {error}
          </p>
        )}
        <p className={styles.privacy}>{COPY.beerProblem.privacy}</p>
        <Button type="submit" block size="md" disabled={state === 'sending'}>
          {state === 'sending' ? COPY.feedback.sending : COPY.beerProblem.send}
        </Button>
      </form>
    </Sheet>
  )
}
