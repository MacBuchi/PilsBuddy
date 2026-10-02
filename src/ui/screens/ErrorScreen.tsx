import { ArrowClockwiseIcon, BugIcon, PlugsIcon } from '@phosphor-icons/react'
import { Component, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { COPY } from '../../data/copy'
import { Button } from '../components/Button'
import { FeedbackSheet } from '../components/FeedbackSheet'
import styles from './ErrorScreen.module.css'

/** "Die Leitung ist trocken." – shown when something below throws. Profile data stays untouched. */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const [report, setReport] = useState(false)
  return (
    <div className={styles.screen} role="alert">
      <div className={styles.orb}>
        <PlugsIcon weight="bold" />
      </div>
      <div className={styles.label}>{COPY.error.label}</div>
      <h1 className={styles.title}>{COPY.error.title}</h1>
      <p className={styles.text}>{COPY.error.text}</p>
      <Button size="md" onClick={onRetry} style={{ marginTop: 8, height: 56, fontSize: 15 }}>
        <ArrowClockwiseIcon weight="bold" /> {COPY.error.cta}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setReport(true)}>
        <BugIcon weight="bold" /> {COPY.error.report}
      </Button>
      {report && <FeedbackSheet initialType="bug" onClose={() => setReport(false)} />}
    </div>
  )
}

interface State {
  failed: boolean
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PilsBuddy crashed', error, info.componentStack)
  }

  render() {
    if (this.state.failed) return <ErrorScreen onRetry={() => this.setState({ failed: false })} />
    return this.props.children
  }
}
