import { SparkleIcon } from '@phosphor-icons/react'
import { COPY } from '../../data/copy'
import { parseAiRequest } from '../../ai/prompt'
import type { AiRequest } from '../../ai/prompt'
import { useAiText } from '../../ai/useAiText'
import styles from './AiText.module.css'

/** An AI text under a deterministic one (Stufe D) – renders nothing while „KI-Texte“ is off or nothing came back. */
export function AiText({ req, title }: { req: AiRequest | null; title: string }) {
  const ai = useAiText(req && parseAiRequest(req))
  if (ai.state === 'off' || ai.state === 'none') return null
  return (
    <div className={styles.box} aria-live="polite" data-ai={ai.state}>
      <span className={styles.title}>
        <SparkleIcon weight="fill" size={14} /> {title}
      </span>
      {ai.state === 'ok' ? (
        <>
          <p className={styles.text}>{ai.text}</p>
          <span className={styles.note}>{COPY.ai.note}</span>
        </>
      ) : (
        <span className={styles.pending}>{COPY.ai.thinking}</span>
      )}
    </div>
  )
}
