import type { ReactNode } from 'react'
import styles from './AppShell.module.css'

/**
 * Phone-sized stage. On phones it fills the viewport; on larger screens it
 * becomes a centred 390 px card so the app still feels like an app.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.stage}>
      <main className={styles.shell}>{children}</main>
    </div>
  )
}
