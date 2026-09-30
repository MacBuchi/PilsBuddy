import type { ReactNode } from 'react'
import { DesktopLeft, DesktopRight } from './DesktopFrame'
import styles from './AppShell.module.css'

/**
 * Phone-sized stage. On phones it fills the viewport; on larger screens it
 * becomes a centred 390 px card, and from 1024 px the desktop companions
 * (navigation left, live DNA right) appear beside it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.stage}>
      <DesktopLeft />
      <main className={styles.shell}>{children}</main>
      <DesktopRight />
    </div>
  )
}
