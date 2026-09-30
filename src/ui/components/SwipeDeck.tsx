import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, Ref } from 'react'
import { deckPosition } from '../../domain/deck'
import type { Beer, Rating } from '../../domain/types'
import { BeerCard } from './BeerCard'
import type { StampOpacity } from './BeerCard'
import styles from './SwipeDeck.module.css'

export interface SwipeDeckHandle {
  /** Fly the top card out as if swiped – used by the action buttons and keyboard. */
  commit: (rating: Rating) => void
  /** Undo: the card with this id flies back in from where it left (call right before un-rating). */
  rewind: (id: string, rating: Rating) => void
}

interface Props {
  /** Beers still in the deck, top card first. */
  queue: Beer[]
  onCommit: (beer: Beer, rating: Rating) => void
  onTap: (beer: Beer) => void
  onDragChange?: (dragging: boolean) => void
  /** Tutorial: tilts the top card as if dragged (while the user isn't touching it). */
  coachOffset?: { x: number; y: number } | null
  ref?: Ref<SwipeDeckHandle>
}

/* Motion constants – Designsystem §5 */
const THRESHOLD_X = 110
const THRESHOLD_UP = 110
const THRESHOLD_DOWN = 120
const VELOCITY = 0.7
const VELOCITY_DOWN = 0.8
const TAP_TOLERANCE = 6
const EXIT_VECTOR: Record<Rating, [number, number]> = {
  LIKE: [560, 60],
  DISLIKE: [-560, 60],
  WANT_TO_TRY: [0, -820],
  UNKNOWN: [0, 820],
  KNOW: [420, -720],
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))

interface Exit {
  rating: Rating
  x: number
  y: number
  dur: number
}

export function SwipeDeck({ queue, onCommit, onTap, onDragChange, coachOffset, ref }: Props) {
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [exit, setExit] = useState<Exit | null>(null)
  /** One frame without transitions so the next card snaps into the top slot. */
  const [swapping, setSwapping] = useState(false)
  /** Undo in progress: the returning card starts at its exit position for one frame. */
  const [entering, setEntering] = useState<{ id: string; x: number; y: number } | null>(null)

  const start = useRef({ x: 0, y: 0 })
  const last = useRef({ x: 0, y: 0, t: 0 })
  const vel = useRef({ x: 0, y: 0 })
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const top = queue[0] ?? null

  useEffect(() => () => clearTimeout(exitTimer.current), [])
  useEffect(() => onDragChange?.(dragging), [dragging, onDragChange])

  const commit = useCallback(
    (rating: Rating, speed = 0) => {
      const beer = top
      if (!beer || exit) return
      const [x, y] = EXIT_VECTOR[rating]
      const dur = clamp(0.34 - speed * 0.08, 0.18, 0.34)
      try {
        navigator.vibrate?.(rating === 'DISLIKE' ? [8, 40, 8] : 14)
      } catch {
        /* no haptics – fine */
      }
      setExit({ rating, x, y, dur })
      setDragging(false)
      clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => {
        setSwapping(true)
        setExit(null)
        setDrag({ x: 0, y: 0 })
        onCommit(beer, rating)
        requestAnimationFrame(() => requestAnimationFrame(() => setSwapping(false)))
      }, dur * 1000)
    },
    [exit, onCommit, top],
  )

  const rewind = useCallback(
    (id: string, rating: Rating) => {
      if (exit) return
      const [x, y] = EXIT_VECTOR[rating]
      setDrag({ x: 0, y: 0 })
      setSwapping(true)
      setEntering({ id, x, y })
    },
    [exit],
  )

  useEffect(() => {
    if (!entering) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setEntering(null)
        setSwapping(false)
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [entering])

  useImperativeHandle(ref, () => ({ commit: (r) => commit(r), rewind }), [commit, rewind])

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (exit) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY }
    last.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    vel.current = { x: 0, y: 0 }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture not supported */
    }
    setDragging(true)
    setDrag({ x: 0, y: 0 })
  }

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const now = performance.now()
    const dt = Math.max(1, now - last.current.t)
    vel.current = { x: (e.clientX - last.current.x) / dt, y: (e.clientY - last.current.y) / dt }
    last.current = { x: e.clientX, y: e.clientY, t: now }
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
  }

  const onUp = () => {
    if (!dragging) return
    const { x, y } = drag
    const ax = Math.abs(x)
    const ay = Math.abs(y)
    const { x: vx, y: vy } = vel.current
    if (ax < TAP_TOLERANCE && ay < TAP_TOLERANCE) {
      setDragging(false)
      if (top) onTap(top)
      return
    }
    let rating: Rating | null = null
    if (ax >= ay) {
      if (x > THRESHOLD_X || vx > VELOCITY) rating = 'LIKE'
      else if (x < -THRESHOLD_X || vx < -VELOCITY) rating = 'DISLIKE'
    } else if (y < -THRESHOLD_UP || vy < -VELOCITY) rating = 'WANT_TO_TRY'
    else if (y > THRESHOLD_DOWN || vy > VELOCITY_DOWN) rating = 'UNKNOWN'

    if (rating) commit(rating, Math.hypot(vx, vy))
    else {
      setDragging(false)
      setDrag({ x: 0, y: 0 })
    }
  }

  const coaching = !!coachOffset && !dragging && !exit
  const view = coaching ? coachOffset : drag
  const progress = exit ? 1 : clamp((Math.abs(view.x) + Math.abs(view.y)) / 150)
  const noTransition = dragging || swapping

  return (
    <div className={styles.deck}>
      {queue.slice(0, 3).map((beer, i) => {
        let transform: string
        let transition: string
        let stamps: StampOpacity = {}
        if (i === 0) {
          if (entering && entering.id === beer.id) {
            transform = `translate(${entering.x}px, ${entering.y}px) rotate(${entering.x * 0.05}deg)`
            transition = 'none'
          } else if (exit) {
            transform = `translate(${exit.x}px, ${exit.y}px) rotate(${exit.x * 0.05}deg)`
            transition = `transform ${exit.dur}s cubic-bezier(.4,0,1,1)`
            stamps = { [exit.rating]: 1 }
          } else {
            transform = `translate(${view.x}px, ${view.y}px) rotate(${view.x * 0.06}deg)`
            transition = noTransition
              ? 'none'
              : coaching
                ? 'transform .6s cubic-bezier(.3,.7,.3,1)'
                : 'transform .5s cubic-bezier(.2,1.5,.4,1)'
            const horizontal = Math.abs(view.x) >= Math.abs(view.y)
            stamps = horizontal
              ? { LIKE: clamp(view.x / THRESHOLD_X), DISLIKE: clamp(-view.x / THRESHOLD_X) }
              : { WANT_TO_TRY: clamp(-view.y / THRESHOLD_UP), UNKNOWN: clamp(view.y / THRESHOLD_DOWN) }
          }
        } else {
          const k = Math.max(0, i - progress)
          transform = `translateY(${k * 16}px) scale(${1 - k * 0.05})`
          transition = noTransition ? 'none' : 'transform .3s ease'
        }
        const top = i === 0
        return (
          <div
            key={beer.id}
            className={`${styles.slot} ${top ? styles.top : ''}`}
            style={{ zIndex: 10 - i, transform, transition, cursor: top ? (dragging ? 'grabbing' : 'grab') : 'default' }}
            onPointerDown={top ? onDown : undefined}
            onPointerMove={top ? onMove : undefined}
            onPointerUp={top ? onUp : undefined}
            onPointerCancel={top ? onUp : undefined}
            aria-hidden={!top}
          >
            <BeerCard beer={beer} position={deckPosition(beer.id)} stamps={stamps} smoothStamps={top && coaching} />
          </div>
        )
      })}
    </div>
  )
}
