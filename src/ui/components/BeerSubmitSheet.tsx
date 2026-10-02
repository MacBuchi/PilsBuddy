import { useEffect, useState } from 'react'
import { COPY } from '../../data/copy'
import { checkSubmission, NOTE_MAX, readSubmissionDraft, sendSubmission, STYLES, writeSubmissionDraft } from '../../data/beerSubmission'
import type { Submission, SubmitResult } from '../../data/beerSubmission'
import { Button } from './Button'
import { Sheet } from './Sheet'
import fb from './FeedbackSheet.module.css'
import styles from './BeerSubmitSheet.module.css'

const PROBLEM: Partial<Record<SubmitResult, string>> = {
  busy: COPY.submit.busy,
  offline: COPY.submit.offline,
  limit: COPY.submit.limit,
}

/**
 * „Bier fehlt? Eintragen“ (R6): brewery (given by the finder or typed with a place), then a link or the
 * beer's facts. No taste questions – an approved beer gets its taste from the style like every regional beer.
 * The draft stays on the device until it was sent.
 */
export function BeerSubmitSheet({ brewery, onClose }: { brewery?: { id: string; name: string } | null; onClose: () => void }) {
  const [s, setS] = useState<Submission>(() => readSubmissionDraft(brewery))
  const [state, setState] = useState<'edit' | 'sending' | 'sent'>('edit')
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (state === 'edit') writeSubmissionDraft(s)
  }, [s, state])

  const set = (p: Partial<Submission>) => {
    setProblem(null)
    setS((old) => ({ ...old, ...p }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = checkSubmission(s)
    if (p) return setProblem(COPY.submit.problems[p])
    setState('sending')
    setProblem(null)
    const result = await sendSubmission(s)
    if (result === 'ok' || result === 'duplicate') {
      writeSubmissionDraft({ ...s, link: '', beerName: '', style: '', abv: '', note: '', breweryPlace: '', breweryName: s.breweryId ? s.breweryName : '' })
      setState('sent')
      if (result === 'duplicate') setProblem(COPY.submit.duplicate)
      return
    }
    setState('edit')
    setProblem(result === 'invalid' ? COPY.submit.problems.what : (PROBLEM[result] ?? COPY.submit.offline))
  }

  if (state === 'sent') {
    return (
      <Sheet title={COPY.submit.thanks} onClose={onClose}>
        <p className={fb.intro}>{problem ?? COPY.submit.thanksSub}</p>
        <Button block size="md" onClick={onClose}>
          {COPY.submit.close}
        </Button>
      </Sheet>
    )
  }

  return (
    <Sheet title={COPY.submit.title} onClose={onClose}>
      <form className={fb.form} onSubmit={submit} noValidate>
        <p className={fb.intro}>{COPY.submit.intro}</p>

        {s.breweryId ? (
          <div className={styles.fixed}>
            <span className="t-label">{COPY.submit.brewery}</span>
            <span className={styles.fixedName}>{s.breweryName}</span>
            <button type="button" className={styles.change} onClick={() => set({ breweryId: null, breweryName: '' })}>
              {COPY.submit.otherBrewery}
            </button>
          </div>
        ) : (
          <>
            <label className={styles.field}>
              <span className="t-label">{COPY.submit.brewery}</span>
              <input
                className={styles.input}
                maxLength={200}
                autoCapitalize="words"
                placeholder={COPY.submit.breweryPh}
                value={s.breweryName}
                onChange={(e) => set({ breweryName: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className="t-label">{COPY.submit.place}</span>
              <input
                className={styles.input}
                maxLength={120}
                placeholder={COPY.submit.placePh}
                value={s.breweryPlace}
                onChange={(e) => set({ breweryPlace: e.target.value })}
              />
            </label>
          </>
        )}

        <label className={styles.field}>
          <span className="t-label">{COPY.submit.link}</span>
          <input
            className={styles.input}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={500}
            placeholder={COPY.submit.linkPh}
            value={s.link}
            onChange={(e) => set({ link: e.target.value })}
          />
        </label>

        <div className={styles.or}>{COPY.submit.or}</div>

        <label className={styles.field}>
          <span className="t-label">{COPY.submit.beerName}</span>
          <input
            className={styles.input}
            maxLength={200}
            autoCapitalize="words"
            placeholder={COPY.submit.beerNamePh}
            value={s.beerName}
            onChange={(e) => set({ beerName: e.target.value })}
          />
        </label>
        <div className={styles.pair}>
          <label className={styles.field}>
            <span className="t-label">{COPY.submit.style}</span>
            <select className={styles.input} value={s.style} onChange={(e) => set({ style: e.target.value })}>
              <option value="">{COPY.submit.styleUnknown}</option>
              {STYLES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className="t-label">{COPY.submit.abv}</span>
            <input
              className={styles.input}
              inputMode="decimal"
              maxLength={6}
              placeholder={COPY.submit.abvPh}
              value={s.abv}
              onChange={(e) => set({ abv: e.target.value })}
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className="t-label">{COPY.submit.note}</span>
          <input
            className={styles.input}
            maxLength={NOTE_MAX}
            placeholder={COPY.submit.notePh}
            value={s.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </label>

        {problem && (
          <p className={fb.problem} role="status">
            {problem}
          </p>
        )}
        <p className={fb.privacy}>{COPY.submit.privacy}</p>
        <Button type="submit" block size="md" disabled={state === 'sending'}>
          {state === 'sending' ? COPY.submit.sending : COPY.submit.send}
        </Button>
      </form>
    </Sheet>
  )
}
