import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import styles from './Sheet.module.css'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet over the whole AppShell (portal into <main>, so scrolling pages don't clip it). Backdrop tap or Escape closes it. */
export function Sheet({ title, onClose, children }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const host = typeof document !== 'undefined' ? document.querySelector('main') : null
  const sheet = (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.grip} />
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
  return host ? createPortal(sheet, host) : sheet
}
