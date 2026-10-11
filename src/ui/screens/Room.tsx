import { BeerSteinIcon, CheckIcon, ShareNetworkIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { COPY, fill } from '../../data/copy'
import { BEER_BY_ID, BUNDLED_IDS } from '../../data/beers'
import { canCheer, canStart, MAX_PLAYERS, normalizeRoomCode, roomCode, roomLink } from '../../domain/games/room'
import type { RoomState } from '../../domain/games/room'
import { useApp } from '../../state/AppContext'
import { useRoom } from '../../sync/useRoom'
import type { RoomView } from '../../sync/useRoom'
import { Button } from '../components/Button'
import { RoomQr } from '../components/RoomQr'
import q from './Quartett.module.css'
import { RoomDuel, RoomFill } from './RoomGames'
import { RoomTasting } from './RoomTasting'
import styles from './Room.module.css'

/** Quartett cards the host can deal – every bundled beer this device knows. */
const DECK_SIZE = BUNDLED_IDS.filter((id) => BEER_BY_ID[id]).length

const newSeed = () => Date.now() ^ Math.floor(Math.random() * 0x7fffffff)

function endText(view: Extract<RoomView, { kind: 'ended' }>): string {
  return fill(COPY.room.end[view.reason], { code: view.code, max: String(MAX_PLAYERS) })
}

/** Spielraum (Stufe E4): open a room or join one; the host holds the state (domain/games/room.ts). */
export function Room() {
  const { state, dispatch, go, toast } = useApp()
  const { buddyNo, ageConfirmed } = state.profile
  const name = fill(COPY.profile.buddyNo, { n: String(buddyNo).padStart(4, '0') })
  const { view, me, start, leave, send } = useRoom(name)
  const [input, setInput] = useState(state.roomJoin ?? '')
  const [bad, setBad] = useState(false)
  const autoJoined = useRef(false)

  // an invite link joins by itself once the age is confirmed
  useEffect(() => {
    if (!state.roomJoin || !ageConfirmed || autoJoined.current) return
    autoJoined.current = true
    void start(state.roomJoin, false)
  }, [state.roomJoin, ageConfirmed, start])

  const live = view.kind === 'live' ? view.state : null
  const isHost = !!live && live.host === me.id

  const exit = () => {
    if (isHost && live.players.length > 1 && !window.confirm(COPY.room.leaveConfirm)) return
    leave()
    go(state.prevScreen === 'room' ? 'games' : state.prevScreen)
  }

  const join = () => {
    const code = normalizeRoomCode(input)
    setBad(!code)
    if (code) void start(code, false)
  }

  const invite = async (code: string) => {
    const url = roomLink(window.location.origin, code)
    const text = fill(COPY.room.inviteText, { code })
    try {
      if (navigator.share) return await navigator.share({ title: COPY.app.name, text, url })
      await navigator.clipboard.writeText(`${text} ${url}`)
      toast(COPY.room.copied)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast(COPY.buddy.failed)
    }
  }

  return (
    <div className={q.screen}>
      <header className={q.head}>
        <button type="button" className={q.close} onClick={exit} aria-label={live ? COPY.room.leave : COPY.room.back}>
          <XIcon weight="bold" />
        </button>
        <span className={q.title}>{COPY.room.title}</span>
        {live && <span className={q.score}>{live.code}</span>}
      </header>

      {!ageConfirmed && (
        <div className={styles.panel}>
          <p className={styles.text}>{COPY.room.age}</p>
          <Button variant="ink" block onClick={() => dispatch({ type: 'SET_AGE', value: true })}>
            {COPY.room.ageOk}
          </Button>
        </div>
      )}

      {ageConfirmed && view.kind === 'idle' && (
        <div className={styles.panel}>
          <p className={styles.text}>{COPY.room.intro}</p>
          <Button variant="ink" block onClick={() => void start(roomCode(newSeed()), true)}>
            {COPY.room.open}
          </Button>
          <span className={styles.or}>{COPY.room.or}</span>
          <form
            className={styles.joinRow}
            onSubmit={(e) => {
              e.preventDefault()
              join()
            }}
          >
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={COPY.room.codePlaceholder}
              aria-label={COPY.room.codeLabel}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
            />
            <Button variant="ghost" size="md" type="submit">
              {COPY.room.join}
            </Button>
          </form>
          {bad && <p className={styles.error}>{COPY.room.badCode}</p>}
        </div>
      )}

      {view.kind === 'connecting' && (
        <p className={styles.status} aria-live="polite">
          {view.host ? COPY.room.connecting : fill(COPY.room.searching, { code: view.code })}
        </p>
      )}

      {view.kind === 'ended' && (
        <div className={styles.panel}>
          <p className={styles.text} role="alert">
            {endText(view)}
          </p>
          <Button variant="ink" block onClick={leave}>
            {COPY.room.retry}
          </Button>
        </div>
      )}

      {live && <Table room={live} meId={me.id} isHost={isHost} onInvite={() => void invite(live.code)} send={send} />}
    </div>
  )
}

interface TableProps {
  room: RoomState
  meId: string
  isHost: boolean
  onInvite: () => void
  send: ReturnType<typeof useRoom>['send']
}

function Table({ room, meId, isHost, onInvite, send }: TableProps) {
  const self = room.players.find((p) => p.id === meId)
  const link = roomLink(window.location.origin, room.code)

  if (room.phase === 'play' && room.game) {
    const props = { room, meId, isHost, send }
    const over = room.game.kind === 'quartett' ? room.game.q.winner !== null : room.game.over
    return (
      <>
        {room.game.kind === 'quartett' ? (
          <RoomDuel {...props} game={room.game} />
        ) : room.game.kind === 'fill' ? (
          <RoomFill {...props} game={room.game} />
        ) : (
          <RoomTasting {...props} game={room.game} />
        )}
        {isHost && !over && (
          <button type="button" className={styles.abort} onClick={() => window.confirm(COPY.room.abortConfirm) && send({ type: 'lobby' })}>
            {COPY.room.abort}
          </button>
        )}
      </>
    )
  }

  if (room.phase === 'cheers') {
    return (
      <div className={styles.cheers} aria-live="polite">
        <BeerSteinIcon weight="fill" className={styles.stein} aria-hidden />
        <h2 className={styles.prost}>{COPY.room.prost}</h2>
        <p className={styles.text}>{fill(COPY.room.prostSub, { n: String(room.round), count: String(room.players.length) })}</p>
        {isHost ? (
          <Button variant="ink" block onClick={() => send({ type: 'lobby' })}>
            {COPY.room.again}
          </Button>
        ) : (
          <p className={styles.hint}>{COPY.room.waitBack}</p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={styles.invite}>
        <RoomQr text={link} label={fill(COPY.room.qr, { code: room.code })} className={styles.qr} />
        <div className={styles.codeBox}>
          <span className={styles.label}>{COPY.room.code}</span>
          <span className={styles.code} data-testid="room-code">
            {room.code}
          </span>
          <span className={styles.hint}>{COPY.room.scan}</span>
          <Button variant="ghost" size="sm" onClick={onInvite}>
            <ShareNetworkIcon weight="bold" /> {COPY.room.invite}
          </Button>
        </div>
      </div>

      <section className={styles.panel} aria-label={fill(COPY.room.players, { n: String(room.players.length), max: String(MAX_PLAYERS) })}>
        <span className={styles.label}>{fill(COPY.room.players, { n: String(room.players.length), max: String(MAX_PLAYERS) })}</span>
        <ul className={styles.players}>
          {room.players.map((p) => (
            <li key={p.id} className={styles.player}>
              <span className={styles.who}>
                {p.name}
                {p.id === room.host && <span className={styles.tag}>{COPY.room.host}</span>}
                {p.id === meId && <span className={styles.tag}>{COPY.room.you}</span>}
              </span>
              <span className={`${styles.state} ${p.ready ? styles.ready : ''}`}>
                {p.ready && <CheckIcon weight="bold" aria-hidden />} {p.ready ? COPY.room.ready : COPY.room.waiting}
              </span>
            </li>
          ))}
        </ul>
        {isHost ? (
          <>
            <Button variant="primary" block disabled={!canCheer(room)} onClick={() => send({ type: 'cheers' })}>
              <BeerSteinIcon weight="fill" /> {COPY.room.cheers}
            </Button>
            {!canCheer(room) && <p className={styles.hint}>{room.players.length < 2 ? COPY.room.alone : COPY.room.waitReady}</p>}
            <div className={styles.games}>
              <span className={styles.label}>{COPY.room.games}</span>
              <Button variant="ink" block disabled={!canStart(room, 'fill')} onClick={() => send({ type: 'start', game: 'fill', seed: newSeed() })}>
                {COPY.room.startFill}
              </Button>
              <Button variant="ink" block disabled={!canStart(room, 'tasting')} onClick={() => send({ type: 'start', game: 'tasting', seed: newSeed() })}>
                {COPY.room.startTasting}
              </Button>
              <Button
                variant="ghost"
                block
                disabled={!canStart(room, 'quartett', DECK_SIZE)}
                onClick={() => send({ type: 'start', game: 'quartett', seed: newSeed() })}
              >
                {COPY.room.startQuartett}
              </Button>
              {canCheer(room) && room.players.length !== 2 && <p className={styles.hint}>{COPY.room.needTwo}</p>}
            </div>
          </>
        ) : (
          <>
            <Button variant={self?.ready ? 'ghost' : 'ink'} block onClick={() => send({ type: 'ready', ready: !self?.ready })}>
              {self?.ready ? COPY.room.notReady : COPY.room.imReady}
            </Button>
            <p className={styles.hint}>{COPY.room.waitHost}</p>
          </>
        )}
      </section>
    </>
  )
}
