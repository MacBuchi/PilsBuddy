import type { RealtimeChannel } from '@supabase/supabase-js'
import { acceptSnapshot, applyIntent, isFull, openRoom, parseIntent, withPresent } from '../domain/games/room'
import type { RoomDeck, RoomIntent, RoomMember, RoomState } from '../domain/games/room'
import { BEER_BY_ID, BUNDLED_IDS } from '../data/beers'
import { cloud } from './cloud'

/**
 * Network side of a game room (Stufe E4), loaded lazily: a Supabase Realtime channel per room
 * code with Broadcast (state snapshots, intents) and Presence (who is there). No sign-in, no
 * table – nothing is stored, the channel only relays between the devices in the room.
 * The host runs the rules from domain/games/room.ts; guests only render what the host sends.
 */

export type RoomEnd = 'gone' | 'notFound' | 'full' | 'error'

export interface RoomEvents {
  onState: (state: RoomState) => void
  onEnd: (reason: RoomEnd) => void
}

export interface RoomConnection {
  send: (intent: RoomIntent) => void
  close: () => void
}

/** The host deals Quartett from the bundled beers, so the guest knows every card. */
const DECK: RoomDeck = { ids: BUNDLED_IDS, lookup: BEER_BY_ID }

/** A guest waits this long for the host's first snapshot. */
const FIND_MS = 8000

interface PresenceMeta {
  name?: unknown
  host?: unknown
}

function presentMembers(channel: RealtimeChannel): (RoomMember & { host: boolean })[] {
  const state = channel.presenceState<PresenceMeta>()
  return Object.entries(state).flatMap(([id, metas]) => {
    const m = metas[0]
    return m ? [{ id, name: typeof m.name === 'string' ? m.name : '?', host: m.host === true }] : []
  })
}

interface JoinOptions {
  setup: (ch: RealtimeChannel) => void
  /** Subscribed and tracked – from here on the others see us. */
  onJoined?: () => void
  onError: () => void
}

function join(code: string, me: RoomMember, host: boolean, { setup, onJoined, onError }: JoinOptions): RealtimeChannel {
  const channel = cloud().channel(`room:${code}`, { config: { broadcast: { self: false }, presence: { key: me.id } } })
  setup(channel)
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') void channel.track({ name: me.name, host }).then(() => onJoined?.())
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onError()
  })
  return channel
}

/** Opens a room as its host. */
export function hostRoom(code: string, me: RoomMember, events: RoomEvents): RoomConnection {
  let state = openRoom(code, me)
  // channel events only arrive after subscribing, so `channel` is set by then
  const publish = (next: RoomState) => {
    if (next === state) return
    state = next
    events.onState(state)
    void channel.send({ type: 'broadcast', event: 'state', payload: state })
  }
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    void cloud().removeChannel(channel)
  }
  const channel = join(code, me, true, {
    setup: (ch) => {
      ch.on('presence', { event: 'sync' }, () => publish(withPresent(state, presentMembers(ch))))
      ch.on('broadcast', { event: 'intent' }, ({ payload }) => {
        const p = payload as { from?: unknown; intent?: unknown } | null
        const intent = parseIntent(p?.intent)
        if (intent && typeof p?.from === 'string') publish(applyIntent(state, p.from, intent, DECK))
      })
      // a guest that just arrived asks for the current state
      ch.on('broadcast', { event: 'hello' }, () => void ch.send({ type: 'broadcast', event: 'state', payload: state }))
    },
    onError: () => {
      close()
      events.onEnd('error')
    },
  })
  events.onState(state)
  return { send: (intent) => publish(applyIntent(state, me.id, intent, DECK)), close }
}

/** Joins someone else's room. */
export function joinRoom(code: string, me: RoomMember, events: RoomEvents): RoomConnection {
  let state: RoomState | null = null
  let ended = false
  let hello: ReturnType<typeof setInterval> | undefined
  const close = () => {
    ended = true
    clearTimeout(timer)
    clearInterval(hello)
    void cloud().removeChannel(channel)
  }
  const end = (reason: RoomEnd) => {
    if (ended) return
    close()
    events.onEnd(reason)
  }
  const timer = setTimeout(() => {
    if (!state) end('notFound')
  }, FIND_MS)
  const askHost = () => {
    if (state || ended) return clearInterval(hello)
    void channel.send({ type: 'broadcast', event: 'hello', payload: {} })
  }
  const channel = join(code, me, false, {
    setup: (ch) => {
      ch.on('broadcast', { event: 'state' }, ({ payload }) => {
        if (ended) return
        const next = acceptSnapshot(state, payload, code)
        if (next === state || !next) return
        state = next
        if (isFull(state, me.id)) return end('full')
        if (state.players.some((p) => p.id === me.id)) events.onState(state)
      })
      ch.on('presence', { event: 'sync' }, () => {
        if (state && !presentMembers(ch).some((m) => m.id === state?.host)) end('gone')
      })
    },
    // ask for the state once we're tracked (so the host already counts us in), again until it answers
    onJoined: () => {
      if (ended) return
      askHost()
      hello = setInterval(askHost, 1500)
    },
    onError: () => end('error'),
  })
  return {
    send: (intent) => void channel.send({ type: 'broadcast', event: 'intent', payload: { from: me.id, intent } }),
    close,
  }
}
