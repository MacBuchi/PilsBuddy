import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomIntent, RoomMember, RoomState } from '../domain/games/room'
import type { RoomConnection, RoomEnd } from './room'

export type RoomView =
  | { kind: 'idle' }
  | { kind: 'connecting'; code: string; host: boolean }
  | { kind: 'live'; state: RoomState }
  | { kind: 'ended'; code: string; reason: RoomEnd | 'offline' }

const loadRoom = () => import('./room')

function visitId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

/**
 * One room visit at a time (Stufe E4). The network code loads only when a room is opened; a new
 * visit gets a fresh random id, so nothing links two evenings. Leaving or unmounting closes it.
 */
export function useRoom(name: string) {
  const [view, setView] = useState<RoomView>({ kind: 'idle' })
  const [me, setMe] = useState<RoomMember>(() => ({ id: visitId(), name }))
  const conn = useRef<RoomConnection | null>(null)
  /** Bumped on every start/leave, so callbacks of an old visit can't touch the view. */
  const visit = useRef(0)

  const close = useCallback(() => {
    visit.current++
    conn.current?.close()
    conn.current = null
  }, [])

  const start = useCallback(
    async (code: string, host: boolean) => {
      close()
      const mine = visit.current
      const who = { id: visitId(), name }
      setMe(who)
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return setView({ kind: 'ended', code, reason: 'offline' })
      setView({ kind: 'connecting', code, host })
      const mod = await loadRoom().catch(() => null)
      if (mine !== visit.current) return
      if (!mod) return setView({ kind: 'ended', code, reason: 'offline' })
      const events = {
        onState: (state: RoomState) => {
          if (mine === visit.current) setView({ kind: 'live', state })
        },
        onEnd: (reason: RoomEnd) => {
          if (mine !== visit.current) return
          close()
          setView({ kind: 'ended', code, reason })
        },
      }
      conn.current = host ? mod.hostRoom(code, who, events) : mod.joinRoom(code, who, events)
    },
    [close, name],
  )

  const leave = useCallback(() => {
    close()
    setView({ kind: 'idle' })
  }, [close])

  const send = useCallback((intent: RoomIntent) => conn.current?.send(intent), [])

  useEffect(() => close, [close])

  return { view, me, start, leave, send }
}
