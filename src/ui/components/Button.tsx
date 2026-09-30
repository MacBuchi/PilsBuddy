import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'ink' | 'ghost' | 'ghost-light' | 'icon'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** Full-width block button. */
  block?: boolean
  size?: 'md' | 'lg' | 'sm'
  children: ReactNode
}

/**
 * Bierdeckel button: 2.5px ink edge, hard Y-only shadow, pressed = translateY(shadow).
 * Variants map to Designsystem §4b (Primär, Tinte auf Gold, Sekundär).
 */
export function Button({ variant = 'primary', block, size = 'lg', className, children, ...rest }: Props) {
  const cls = [styles.btn, styles[variant], styles[size], block ? styles.block : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}
