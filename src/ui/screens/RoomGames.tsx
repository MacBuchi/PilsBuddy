import { useState } from 'react'
import { BEER_BY_ID } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { GLASS_BY_ID } from '../../domain/games/fill'
import { fillPoints, fillRanking, roundFor, seatOf } from '../../domain/games/party'
import type { Duel, FillParty } from '../../domain/games/party'
import type { QuartettRound, StatKey } from '../../domain/games/quartett'
import type { RoomIntent, RoomState } from '../../domain/games/room'
import { Button } from '../components/Button'
import { FillGlass } from '../components/FillGlass'
import { FillPicker } from './FillGame'
import { litres, markOf, maxOf, ml, show, STAT_LABEL, startValue } from './gameFormat'
import { OpponentCard, QuartettCard } from './Quartett'
import fs from './FillGame.module.css'
import q from './Quartett.module.css'
import styles from './Room.module.css'

/** The games on the room's table (Stufe E5). The host runs the rules (domain/games/party.ts); this only renders and sends wishes. */

interface GameProps<G> {
  room: RoomState
  game: G
  meId: string
  isHost: boolean
  send: (intent: RoomIntent) => void
}

const nameOf = (room: RoomState, id: string) => room.players.find((p) => p.id === id)?.name ?? '?'

function BackToTable({ isHost, send }: { isHost: boolean; send: (intent: RoomIntent) => void }) {
  return isHost ? (
    <Button variant="ink" block onClick={() => send({ type: 'lobby' })}>
      {COPY.room.again}
    </Button>
  ) : (
    <p className={styles.hint}>{COPY.room.waitBack}</p>
  )
}

function duelQuip(r: QuartettRound, round: number, them: string): string {
  const list = r.outcome === 'tie' ? COPY.quartett.tie : r.outcome === 0 ? COPY.room.duel.win : COPY.room.duel.lose
  const [mine, theirs] = r.cards.map((id) => BEER_BY_ID[id].name)
  return fill(list[round % list.length], {
    mine,
    theirs,
    them,
    stat: STAT_LABEL[r.stat],
    vm: show(r.stat, r.values[0]),
    vt: show(r.stat, r.values[1]),
  })
}

/** Quartett zu zweit: the same table as against the bot, seen from the own seat. */
export function RoomDuel({ room, game, meId, isHost, send }: GameProps<Duel>) {
  const st = game.q
  const seat = seatOf(game, meId)
  // a round stays on screen until its player taps „Weiter“; later rounds show the newest one
  const [seen, setSeen] = useState(st.round)
  const [pickedIn, setPickedIn] = useState(-1)
  const [a, b] = game.seats.map((id) => nameOf(room, id))

  const ids = [...st.piles[0], ...st.piles[1], ...st.pot, ...(st.last?.cards ?? [])]
  if (!ids.every((id) => BEER_BY_ID[id])) {
    return (
      <div className={styles.panel}>
        <p className={styles.text} role="alert">
          {COPY.room.stale}
        </p>
        <BackToTable isHost={isHost} send={send} />
      </div>
    )
  }

  if (seat === null) {
    return (
      <div className={styles.panel} aria-live="polite">
        <p className={styles.text}>{fill(COPY.room.duel.watching, { a, b })}</p>
        <p className={styles.hint}>
          {fill(COPY.room.duel.watchScore, { a, b, na: String(st.piles[0].length), nb: String(st.piles[1].length) })}
        </p>
      </div>
    )
  }

  const other = seat === 0 ? b : a
  const showing = st.last !== null && seen < st.round
  const last = showing && st.last ? roundFor(st.last, seat) : null
  const over = st.winner !== null && !showing
  const myTurn = !showing && !over && st.turn === seat && pickedIn !== st.round
  const myBeer = BEER_BY_ID[last ? last.cards[0] : st.piles[seat][0]]
  const theirBeer = last ? BEER_BY_ID[last.cards[1]] : null
  const mark = last ? markOf(last) : null
  const counts = [st.piles[seat].length, st.piles[seat === 0 ? 1 : 0].length]

  const pick = (stat: StatKey) => {
    if (!myTurn) return
    setPickedIn(st.round)
    send({ type: 'stat', stat })
  }

  const status = last
    ? `${last.chooser === 0 ? fill(COPY.quartett.youPick, { stat: STAT_LABEL[last.stat] }) : fill(COPY.room.duel.theyPick, { name: other, stat: STAT_LABEL[last.stat] })} ${duelQuip(last, st.round, other)}`
    : st.turn === seat
      ? COPY.quartett.yourTurn
      : fill(COPY.room.duel.theirTurn, { name: other })

  return (
    <>
      <div className={q.meta}>
        <span>
          {fill(COPY.quartett.round, { n: String(Math.min(st.round + (last ? 0 : 1), st.maxRounds)), max: String(st.maxRounds) })}
        </span>
        {st.pot.length > 0 && <span className={q.pot}>{fill(COPY.quartett.pot, { n: String(st.pot.length) })}</span>}
        <span>{fill(COPY.quartett.score, { you: String(counts[0]), bot: String(counts[1]) })}</span>
      </div>

      <div className={q.table}>
        <OpponentCard beer={theirBeer} round={last} thinking={!last && st.turn !== seat} cards={counts[1]} mark={mark} name={other} />
        {myBeer && (
          <QuartettCard beer={myBeer} picked={last?.stat ?? null} mark={mark} onPick={myTurn ? pick : undefined} key={myBeer.id + st.round} />
        )}
      </div>

      <footer className={q.foot}>
        <p className={`${q.status} ${mark ? q[mark] : ''}`} aria-live="polite">
          {over ? '' : status}
        </p>
        {showing && (
          <Button variant="ink" block onClick={() => setSeen(st.round)}>
            {COPY.quartett.next}
          </Button>
        )}
      </footer>

      {over && (
        <div className={q.endWrap} role="dialog" aria-modal="true" aria-labelledby="duel-end">
          <div className={q.end}>
            <span className={q.endScore}>{fill(COPY.quartett.score, { you: String(counts[0]), bot: String(counts[1]) })}</span>
            <h2 id="duel-end" className={q.endTitle}>
              {st.winner === 'draw'
                ? COPY.quartett.end.draw
                : fill(st.winner === seat ? COPY.room.duel.won : COPY.room.duel.lost, { name: other })}
            </h2>
            <BackToTable isHost={isHost} send={send} />
          </div>
        </div>
      )}
    </>
  )
}

/** „Wie viel ist drin?“ for everyone: one glass at a time, everyone guesses, the host reveals. */
export function RoomFill(props: GameProps<FillParty>) {
  const { room, game, meId, isHost, send } = props
  if (game.over) {
    const ranking = fillRanking(
      game,
      room.players.map((p) => p.id),
    )
    const top = ranking.filter((r) => r.place === 1)
    const title =
      top.length > 1 ? COPY.room.party.shared : top[0]?.id === meId ? COPY.room.party.bestYou : fill(COPY.room.party.best, { name: nameOf(room, top[0]?.id ?? '') })
    return (
      <section className={styles.panel} aria-labelledby="party-end">
        <span className={styles.label}>{COPY.room.party.result}</span>
        <h2 id="party-end" className={styles.result}>
          {title}
        </h2>
        <ol className={styles.players}>
          {ranking.map((r) => (
            <li key={r.id} className={styles.player}>
              <span className={styles.who}>
                <span className={styles.place}>{r.place}.</span> {nameOf(room, r.id)}
                {r.id === meId && <span className={styles.tag}>{COPY.room.you}</span>}
              </span>
              <span className={styles.points}>{fill(COPY.room.party.points, { p: String(r.points) })}</span>
            </li>
          ))}
        </ol>
        <BackToTable isHost={isHost} send={send} />
      </section>
    )
  }
  // a fresh picker for every glass
  return <FillTurn key={game.index} {...props} />
}

function FillTurn({ room, game, meId, isHost, send }: GameProps<FillParty>) {
  const round = game.rounds[game.index]
  const glass = GLASS_BY_ID[round.glass]
  const max = maxOf(glass)
  const [value, setValue] = useState(() => startValue(glass))
  const [sent, setSent] = useState(false)
  const mine = Object.hasOwn(game.guesses, meId) ? game.guesses[meId] : null
  const guessed = room.players.filter((p) => Object.hasOwn(game.guesses, p.id)).length
  const last = game.index + 1 >= game.rounds.length

  const submit = () => {
    if (sent || mine !== null) return
    setSent(true)
    send({ type: 'guess', ml: value })
  }

  const list = [...room.players].sort((x, y) => (fillPoints(game, y.id) ?? -1) - (fillPoints(game, x.id) ?? -1))

  return (
    <>
      <div className={q.meta}>
        <span>{fill(COPY.fill.round, { n: String(game.index + 1), max: String(game.rounds.length) })}</span>
        <span>{fill(COPY.fill.mark, { v: litres(glass.nominal) })}</span>
        <span>{fill(COPY.fill.score, { n: String(game.points[meId] ?? 0) })}</span>
      </div>

      <section className={fs.stage} aria-label={COPY.fill.glasses[glass.id]}>
        <h2 className={fs.glassName}>{COPY.fill.glasses[glass.id]}</h2>
        <FillGlass
          glass={glass}
          ml={round.ml}
          guess={game.revealed ? mine : null}
          markLabel={litres(glass.nominal)}
          height={game.revealed ? 200 : 260}
          pourKey={game.index}
        />
      </section>

      <footer className={q.foot}>
        {!game.revealed && mine === null && !sent && (
          <>
            <p className={q.status}>{COPY.fill.ask}</p>
            <FillPicker value={value} max={max} onChange={(v) => setValue(Math.min(max, Math.max(0, v)))} />
            <Button variant="ink" block onClick={submit}>
              {COPY.fill.submit}
            </Button>
          </>
        )}
        {!game.revealed && (mine !== null || sent) && (
          <>
            <p className={q.status} aria-live="polite">
              {COPY.room.party.waitOthers}
            </p>
            <p className={styles.hint}>{fill(COPY.room.party.guessed, { n: String(guessed), max: String(room.players.length) })}</p>
          </>
        )}
        {!game.revealed && isHost && guessed > 0 && guessed < room.players.length && (
          <Button variant="ghost" block onClick={() => send({ type: 'reveal' })}>
            {COPY.room.party.reveal}
          </Button>
        )}
        {game.revealed && (
          <>
            <p className={fs.truth} aria-live="polite">
              {fill(COPY.fill.truth, { ml: ml(round.ml) })}
            </p>
            <ul className={styles.players}>
              {list.map((p) => {
                const pts = fillPoints(game, p.id)
                return (
                  <li key={p.id} className={styles.player}>
                    <span className={styles.who}>
                      {p.name}
                      {p.id === meId && <span className={styles.tag}>{COPY.room.you}</span>}
                    </span>
                    <span className={styles.points}>
                      {pts === null
                        ? COPY.room.party.noGuess
                        : `${ml(game.guesses[p.id])} · ${fill(COPY.room.party.points, { p: String(pts) })}`}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className={fs.fact}>{COPY.fill.facts[glass.id]}</p>
            {isHost ? (
              <Button variant="ink" block onClick={() => send({ type: 'next' })}>
                {last ? COPY.room.party.finish : COPY.room.party.next}
              </Button>
            ) : (
              <p className={styles.hint}>{COPY.room.party.waitNext}</p>
            )}
          </>
        )}
      </footer>
    </>
  )
}
