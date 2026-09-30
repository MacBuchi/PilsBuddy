import { useEffect, useState } from 'react'
import { COPY } from '../data/copy'

export type CoachDirection = keyof typeof COPY.coach.chips

/** How far the tutorial tilts the card – just under the commit thresholds, so stamps show at ~80 %. */
export const COACH_OFFSET: Record<CoachDirection, { x: number; y: number }> = {
  LIKE: { x: 92, y: 0 },
  DISLIKE: { x: -92, y: 0 },
  WANT_TO_TRY: { x: 0, y: -70 },
  UNKNOWN: { x: 0, y: 92 },
}

export const COACH_ORDER: CoachDirection[] = ['LIKE', 'DISLIKE', 'WANT_TO_TRY', 'UNKNOWN']
const ROUNDS = 2
const START_DELAY = 700
const HOLD = 950
const REST = 550

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export interface CoachStep {
  /** Direction currently demonstrated, null while the card rests between moves. */
  direction: CoachDirection | null
  /** False once the demo rounds are over (chips stay, hand goes). */
  running: boolean
}

/**
 * Drives the tutorial: tilts right, left, up, down with a pause in between, two rounds, then stops.
 * With reduced motion it never moves – the chips alone explain the gestures.
 */
export function useCoachSteps(active: boolean): CoachStep {
  const [step, setStep] = useState<CoachStep>({ direction: null, running: false })

  useEffect(() => {
    if (!active || prefersReducedMotion()) return
    const timers: ReturnType<typeof setTimeout>[] = []
    let t = START_DELAY
    timers.push(setTimeout(() => setStep({ direction: null, running: true }), 0))
    for (let r = 0; r < ROUNDS; r++) {
      for (const dir of COACH_ORDER) {
        timers.push(setTimeout(() => setStep({ direction: dir, running: true }), t))
        t += HOLD
        timers.push(setTimeout(() => setStep({ direction: null, running: true }), t))
        t += REST
      }
    }
    timers.push(setTimeout(() => setStep({ direction: null, running: false }), t))
    return () => {
      timers.forEach(clearTimeout)
      setStep({ direction: null, running: false })
    }
  }, [active])

  return step
}
