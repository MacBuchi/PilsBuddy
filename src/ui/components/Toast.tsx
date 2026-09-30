import styles from './Toast.module.css'

interface Props {
  text: string
  color?: string
  /** 'top' = global toast under the status area, 'bottom' = above the swipe actions. */
  position?: 'top' | 'bottom'
  /** Changing the key restarts the animation. */
  animKey: number
}

export function Toast({ text, color, position = 'top', animKey }: Props) {
  return (
    <div
      key={animKey}
      className={`${styles.toast} ${position === 'top' ? styles.top : styles.bottom}`}
      style={{ borderColor: color ?? 'var(--gold)' }}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  )
}
