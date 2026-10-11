import { StarIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { BEER_BY_ID, BEERS } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { matchesQuery } from '../../domain/library'
import type { RoomIntent, RoomState } from '../../domain/games/room'
import {
  currentRound,
  customBeer,
  MAX_TASTING_BEERS,
  mostDisputed,
  ratingFor,
  summarize,
  tastingBeer,
  tastingRanking,
  TASTING_AXES,
} from '../../domain/games/tasting'
import type { Tasting, TastingAxis, TastingBeer, TastingRound } from '../../domain/games/tasting'
import { useApp } from '../../state/AppContext'
import { LANG } from '../../state/lang'
import { Button } from '../components/Button'
import fs from './FillGame.module.css'
import q from './Quartett.module.css'
import styles from './Room.module.css'
import t from './RoomTasting.module.css'

/** Tasting-Abend (Stufe E6) on the room's table. The host runs the rules (domain/games/tasting.ts); this renders and sends wishes. */

interface Props {
  room: RoomState
  game: Tasting
  meId: string
  isHost: boolean
  send: (intent: RoomIntent) => void
}

const RESULTS = 6
const AXIS_LABEL: Record<TastingAxis, string> = {
  bitterness: COPY.quartett.stats.bitterness,
  body: COPY.quartett.stats.body,
  sweetness: COPY.quartett.stats.sweetness,
}
const decimal = (n: number) => n.toLocaleString(LANG, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Stars({ n, label }: { n: number; label?: string }) {
  return (
    <span className={t.stars} role="img" aria-label={label ?? fill(COPY.room.tasting.star, { n: String(n) })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} weight={i <= n ? 'fill' : 'regular'} aria-hidden />
      ))}
    </span>
  )
}

function BeerHead({ beer, n }: { beer: TastingBeer; n: number }) {
  return (
    <div className={t.beerHead}>
      <span className={styles.label}>{fill(COPY.room.tasting.beer, { n: String(n) })}</span>
      <h2 className={t.beerName}>{beer.name}</h2>
      {(beer.brewery || beer.style) && <span className={styles.hint}>{[beer.brewery, beer.style].filter(Boolean).join(' · ')}</span>}
    </div>
  )
}

export function RoomTasting(props: Props) {
  const { game, isHost, send } = props
  const round = currentRound(game)
  if (game.over) return <TastingEnd {...props} />
  if (!round) {
    return isHost ? (
      <section className={styles.panel}>
        <Pour send={send} />
      </section>
    ) : (
      <p className={styles.status} aria-live="polite">
        {COPY.room.tasting.waitPour}
      </p>
    )
  }
  const n = game.rounds.length
  // a fresh form for every beer
  if (!round.revealed) return <Rate key={n} {...props} round={round} n={n} />
  return (
    <>
      <Reveal key={n} {...props} round={round} n={n} />
      {isHost ? (
        <section className={styles.panel}>
          {n < MAX_TASTING_BEERS ? <Pour send={send} /> : <p className={styles.text}>{COPY.room.tasting.full}</p>}
          <Button variant="ghost" block onClick={() => send({ type: 'end' })}>
            {COPY.room.tasting.end}
          </Button>
        </section>
      ) : (
        <p className={styles.hint}>{COPY.room.tasting.waitNext}</p>
      )}
    </>
  )
}

/** The host picks what is in the glass: a beer from the catalog, or one typed by hand. */
function Pour({ send }: { send: Props['send'] }) {
  const [query, setQuery] = useState('')
  const hits = useMemo(() => (query.trim() ? BEERS.filter((b) => matchesQuery(b, query)).slice(0, RESULTS) : []), [query])
  const custom = customBeer(query)
  const pour = (beer: TastingBeer) => send({ type: 'pour', beer })
  return (
    <div className={t.pour}>
      <span className={styles.label}>{COPY.room.tasting.pick}</span>
      <input
        className={styles.input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={COPY.room.tasting.searchPlaceholder}
        aria-label={COPY.room.tasting.search}
        autoComplete="off"
        spellCheck={false}
        maxLength={60}
      />
      {!query.trim() && <p className={styles.hint}>{COPY.room.tasting.pickHint}</p>}
      {hits.length > 0 && (
        <ul className={t.hits}>
          {hits.map((b) => (
            <li key={b.id}>
              <button type="button" className={t.hit} onClick={() => pour(tastingBeer(b))}>
                <span className={t.hitName}>{b.name}</span>
                <span className={t.hitSub}>{[b.brewery, b.style].join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {custom && (
        <>
          {!hits.length && <p className={styles.hint}>{COPY.room.tasting.noMatch}</p>}
          <Button variant="ghost" size="md" block onClick={() => pour(custom)}>
            {fill(COPY.room.tasting.custom, { name: custom.name })}
          </Button>
        </>
      )}
    </div>
  )
}

function Rate({ room, meId, isHost, send, round, n }: Props & { round: TastingRound; n: number }) {
  const [stars, setStars] = useState(0)
  const [axes, setAxes] = useState<Record<TastingAxis, number>>({ bitterness: 50, body: 50, sweetness: 50 })
  const [sent, setSent] = useState(false)
  const done = sent || Object.hasOwn(round.verdicts, meId)
  const rated = room.players.filter((p) => Object.hasOwn(round.verdicts, p.id)).length

  const submit = () => {
    if (done || !stars) return
    setSent(true)
    send({ type: 'rate', verdict: { stars, axes } })
  }

  return (
    <section className={styles.panel} aria-labelledby="tasting-ask">
      <BeerHead beer={round.beer} n={n} />
      {!done ? (
        <>
          <p id="tasting-ask" className={styles.text}>
            {COPY.room.tasting.ask}
          </p>
          <div className={t.starPick} role="radiogroup" aria-label={COPY.room.tasting.starsLabel}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={stars === i}
                aria-label={fill(COPY.room.tasting.star, { n: String(i) })}
                className={`${t.starBtn} ${i <= stars ? t.on : ''}`}
                onClick={() => setStars(i)}
              >
                <StarIcon weight={i <= stars ? 'fill' : 'bold'} aria-hidden />
              </button>
            ))}
          </div>
          {TASTING_AXES.map((a) => (
            <label key={a} className={t.axis}>
              <span className={t.axisHead}>
                <span>{AXIS_LABEL[a]}</span>
                <span className={t.scale}>
                  {COPY.room.tasting.little} – {COPY.room.tasting.lots}
                </span>
              </span>
              <input
                className={fs.slider}
                type="range"
                min={0}
                max={100}
                step={5}
                value={axes[a]}
                onChange={(e) => setAxes({ ...axes, [a]: Number(e.target.value) })}
              />
            </label>
          ))}
          <Button variant="ink" block disabled={!stars} onClick={submit}>
            {COPY.room.tasting.submit}
          </Button>
        </>
      ) : (
        <p className={q.status} aria-live="polite">
          {COPY.room.tasting.waitOthers}
        </p>
      )}
      <p className={styles.hint}>{fill(COPY.room.tasting.rated, { n: String(rated), max: String(room.players.length) })}</p>
      {isHost && rated > 0 && rated < room.players.length && (
        <Button variant="ghost" block onClick={() => send({ type: 'reveal' })}>
          {COPY.room.tasting.reveal}
        </Button>
      )}
    </section>
  )
}

function Reveal({ room, meId, round, n }: Props & { round: TastingRound; n: number }) {
  const { state, rate } = useApp()
  const [saved, setSaved] = useState(false)
  const sum = summarize(round)
  const mine = round.verdicts[meId]
  const known = round.beer.id && BEER_BY_ID[round.beer.id] ? round.beer.id : null
  const wish = mine ? ratingFor(mine.stars) : null
  const canSave = !!known && !!wish && state.profile.ratings[known]?.rating !== wish
  if (!sum) return null
  const list = [...room.players].sort((x, y) => (round.verdicts[y.id]?.stars ?? 0) - (round.verdicts[x.id]?.stars ?? 0))

  return (
    <section className={styles.panel} aria-labelledby="tasting-reveal">
      <BeerHead beer={round.beer} n={n} />
      <div className={t.average} aria-live="polite">
        <span id="tasting-reveal" className={styles.result}>
          {fill(COPY.room.tasting.average, { stars: decimal(sum.stars) })}
        </span>
        <Stars n={Math.round(sum.stars)} />
      </div>
      <p className={styles.text}>
        {sum.split ? fill(COPY.room.tasting.split, { low: String(sum.low), high: String(sum.high) }) : COPY.room.tasting.agree}
      </p>

      <div className={t.compare}>
        <span className={t.legend}>
          <span className={`${t.dot} ${t.dotTable}`} aria-hidden /> {COPY.room.tasting.table}
          {round.beer.taste && (
            <>
              <span className={`${t.dot} ${t.dotProfile}`} aria-hidden />{' '}
              {round.beer.estimate ? COPY.room.tasting.estimate : COPY.room.tasting.profile}
            </>
          )}
        </span>
        {TASTING_AXES.map((a) => (
          <div key={a} className={t.bar}>
            <span className={t.axisHead}>
              <span>{AXIS_LABEL[a]}</span>
              <span className={t.scale}>
                {sum.axes[a]}
                {round.beer.taste ? ` · ${round.beer.taste[a]}` : ''}
              </span>
            </span>
            <span className={t.track}>
              {round.beer.taste && <span className={`${t.dot} ${t.dotProfile}`} style={{ left: `${round.beer.taste[a]}%` }} />}
              <span className={`${t.dot} ${t.dotTable}`} style={{ left: `${sum.axes[a]}%` }} />
            </span>
          </div>
        ))}
      </div>

      <ul className={styles.players}>
        {list.map((p) => {
          const v = round.verdicts[p.id]
          return (
            <li key={p.id} className={styles.player}>
              <span className={styles.who}>
                {p.name}
                {p.id === meId && <span className={styles.tag}>{COPY.room.you}</span>}
              </span>
              {v ? <Stars n={v.stars} /> : <span className={styles.points}>{COPY.room.tasting.noVerdict}</span>}
            </li>
          )
        })}
      </ul>

      {saved ? (
        <p className={styles.hint} role="status">
          {COPY.room.tasting.saved}
        </p>
      ) : (
        canSave &&
        wish && (
          <Button
            variant="ghost"
            size="md"
            block
            onClick={() => {
              rate(known, wish)
              setSaved(true)
            }}
          >
            {COPY.room.tasting.save[wish === 'LIKE' ? 'LIKE' : 'DISLIKE']}
          </Button>
        )
      )}
    </section>
  )
}

function TastingEnd({ game, meId, isHost, send }: Props) {
  const ranking = tastingRanking(game)
  const top = ranking.filter((r) => r.place === 1)
  const disputed = mostDisputed(game)
  const split = disputed === null ? null : summarize(game.rounds[disputed])
  return (
    <section className={styles.panel} aria-labelledby="tasting-end">
      <span className={styles.label}>
        {COPY.room.tasting.result} · {ranking.length === 1 ? COPY.room.tasting.one : fill(COPY.room.tasting.count, { n: String(ranking.length) })}
      </span>
      <h2 id="tasting-end" className={styles.result}>
        {top.length > 1 ? COPY.room.tasting.sharedTop : fill(COPY.room.tasting.favourite, { name: top[0]?.beer.name ?? '' })}
      </h2>
      {disputed !== null && split && (
        <p className={styles.text}>
          {fill(COPY.room.tasting.disputed, { name: game.rounds[disputed].beer.name, low: String(split.low), high: String(split.high) })}
        </p>
      )}
      <ol className={styles.players}>
        {ranking.map((r) => {
          const own = game.rounds[r.index].verdicts[meId]
          return (
            <li key={r.index} className={styles.player}>
              <span className={styles.who}>
                <span className={styles.place}>{r.place}.</span> {r.beer.name}
              </span>
              <span className={t.endScore}>
                <span className={styles.points}>{fill(COPY.room.tasting.average, { stars: decimal(r.summary.stars) })}</span>
                {own && <Stars n={own.stars} label={`${COPY.room.you}: ${fill(COPY.room.tasting.star, { n: String(own.stars) })}`} />}
              </span>
            </li>
          )
        })}
      </ol>
      {isHost ? (
        <Button variant="ink" block onClick={() => send({ type: 'lobby' })}>
          {COPY.room.again}
        </Button>
      ) : (
        <p className={styles.hint}>{COPY.room.waitBack}</p>
      )}
    </section>
  )
}
