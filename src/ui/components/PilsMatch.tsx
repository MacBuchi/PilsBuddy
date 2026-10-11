import { CaretDownIcon, ProhibitIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { getBeer } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import type { BuddyComparison } from '../../domain/buddyLink'
import { cleanHandle, rankPeople } from '../../domain/pilsMatch'
import type { MatchFeed, RankedPerson } from '../../domain/pilsMatch'
import { useApp } from '../../state/AppContext'
import { hasCloudAccount } from '../../sync/useCloudSync'
import { Button } from './Button'
import { BuddyAvatar } from './BuddyAvatar'
import matches from '../screens/Matches.module.css'
import styles from './PilsMatch.module.css'

const loadMatch = () => import('../../sync/match')

type Load = { state: 'loading' } | { state: 'offline' | 'error' } | { state: 'ok'; feed: MatchFeed }
const failed = (e: unknown): Load => ({ state: (e as { kind?: string }).kind === 'offline' ? 'offline' : 'error' })

/** Shared beers, quarrels and tips – the buddy link (C1) and Pils-Match (C2) compare the same way. */
export function ComparePills({ compare, tipsLabel }: { compare: BuddyComparison; tipsLabel: string }) {
  const { openDetail } = useApp()
  const pills = (ids: string[], cls: string) => (
    <div className={matches.pills}>
      {ids.map((id) => (
        <button key={id} type="button" className={cls} onClick={() => openDetail(id)}>
          {getBeer(id).name}
        </button>
      ))}
    </div>
  )
  return (
    <>
      {compare.shared.length > 0 && (
        <div className={matches.group}>
          <span className={matches.groupLabel}>{COPY.buddy.both}</span>
          {pills(compare.shared, matches.pillLike)}
        </div>
      )}
      {compare.disagree.length > 0 && (
        <div className={matches.group}>
          <span className={matches.groupLabel}>{COPY.buddy.disagree}</span>
          {pills(compare.disagree, matches.pillNope)}
        </div>
      )}
      {compare.shared.length + compare.disagree.length === 0 && <div className={matches.note}>{COPY.buddy.none}</div>}
      {compare.tips.length > 0 && (
        <div className={matches.group}>
          <span className={matches.groupLabel}>{tipsLabel}</span>
          {pills(compare.tips.slice(0, 6), matches.pillTip)}
        </div>
      )}
    </>
  )
}

/** Matches › Menschen: Pils-Match opt-in, the feed, clinking and blocking (Stufe C2/C3). */
export function PilsMatch() {
  const { state, toast } = useApp()
  const { profile } = state
  const account = hasCloudAccount(profile.sync)
  const [load, setLoad] = useState<Load>(() => (account ? { state: 'loading' } : { state: 'ok', feed: { visible: false, handle: null, people: [] } }))
  const [open, setOpen] = useState<string | null>(null)

  const [attempt, setAttempt] = useState(0)
  const refresh = () => {
    setLoad({ state: 'loading' })
    setAttempt((n) => n + 1)
  }

  // once per visit of the tab (and once an account exists); actions below update the list themselves
  useEffect(() => {
    if (!account) return
    let live = true
    loadMatch()
      .then((m) => m.loadFeed())
      .then(
        (feed) => live && setLoad({ state: 'ok', feed }),
        (e: unknown) => live && setLoad(failed(e)),
      )
    return () => {
      live = false
    }
  }, [account, attempt])

  const people = useMemo(
    () => (load.state === 'ok' ? rankPeople(profile.ratings, load.feed.people) : []),
    [load, profile.ratings],
  )

  if (load.state === 'loading') return <div className={styles.status}>{COPY.pilsMatch.loading}</div>
  if (load.state !== 'ok')
    return (
      <div className={styles.status}>
        {load.state === 'offline' ? COPY.pilsMatch.offline : COPY.pilsMatch.error}{' '}
        <button type="button" className={styles.link} onClick={refresh}>
          {COPY.pilsMatch.retry}
        </button>
      </div>
    )

  const { feed } = load
  if (!feed.visible) return <OptIn handle={feed.handle} onJoined={(next) => setLoad({ state: 'ok', feed: next })} />

  const update = (id: string, change: Partial<RankedPerson> | null) =>
    setLoad({
      state: 'ok',
      feed: {
        ...feed,
        people: change ? feed.people.map((p) => (p.id === id ? { ...p, ...change } : p)) : feed.people.filter((p) => p.id !== id),
      },
    })

  const toggleClink = async (p: RankedPerson) => {
    try {
      const m = await loadMatch()
      await m.clink(p.id, !p.mine)
      update(p.id, { mine: !p.mine, mutual: false })
      if (!p.mine) toast(fill(COPY.pilsMatch.clinkedToast, { handle: p.handle }))
      // a clink back makes buddies – the feed knows
      if (!p.mine) void m.loadFeed().then((next) => setLoad({ state: 'ok', feed: next })).catch(() => undefined)
    } catch (e) {
      toast(failed(e).state === 'offline' ? COPY.pilsMatch.offline : COPY.pilsMatch.error)
    }
  }

  const blockPerson = async (p: RankedPerson) => {
    if (!window.confirm(fill(COPY.pilsMatch.blockConfirm, { handle: p.handle }))) return
    try {
      await (await loadMatch()).block(p.id)
      update(p.id, null)
      toast(fill(COPY.pilsMatch.blocked, { handle: p.handle }))
    } catch (e) {
      toast(failed(e).state === 'offline' ? COPY.pilsMatch.offline : COPY.pilsMatch.error)
    }
  }

  const leave = async () => {
    if (!window.confirm(COPY.pilsMatch.leaveConfirm)) return
    try {
      await (await loadMatch()).becomeHidden()
      setLoad({ state: 'ok', feed: { visible: false, handle: feed.handle, people: [] } })
      toast(COPY.pilsMatch.left)
    } catch (e) {
      toast(failed(e).state === 'offline' ? COPY.pilsMatch.offline : COPY.pilsMatch.error)
    }
  }

  const row = (p: RankedPerson) => {
    const expanded = open === p.id
    return (
      <div key={p.id} className={styles.person}>
        <button type="button" className={styles.personHead} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : p.id)}>
          <span className={styles.avatar}>
            <BuddyAvatar archetype={p.compare.buddyArchetype} decoded={p.compare.buddyDna.decoded} size={48} />
          </span>
          <span className={styles.personText}>
            <span className={styles.handle}>@{p.handle}</span>
            <span className={styles.persona}>{fill(COPY.pilsMatch.persona, { persona: COPY.personas[p.compare.buddyArchetype].name })}</span>
          </span>
          <span className={styles.pct}>{p.compare.pct} %</span>
          <CaretDownIcon weight="bold" size={16} className={expanded ? styles.caretOpen : styles.caret} />
        </button>
        {expanded && (
          <div className={styles.personBody}>
            <ComparePills compare={p.compare} tipsLabel={fill(COPY.pilsMatch.tips, { handle: `@${p.handle}` })} />
            <button type="button" className={styles.block} onClick={() => void blockPerson(p)}>
              <ProhibitIcon weight="bold" size={14} /> {COPY.pilsMatch.block}
            </button>
          </div>
        )}
        <div className={styles.actions}>
          {p.mutual ? (
            <span className={styles.mutual}>{COPY.pilsMatch.mutual}</span>
          ) : (
            <button
              type="button"
              className={`${styles.clink} ${p.mine ? styles.clinkOn : ''}`}
              aria-pressed={p.mine}
              onClick={() => void toggleClink(p)}
            >
              {p.mine ? `✓ ${COPY.pilsMatch.clinked}` : COPY.pilsMatch.clink}
            </button>
          )}
        </div>
      </div>
    )
  }

  const buddies = people.filter((p) => p.mutual)
  const others = people.filter((p) => !p.mutual)
  return (
    <>
      <div className={styles.me}>
        <span>{fill(COPY.pilsMatch.youAre, { handle: `@${feed.handle}` })}</span>
        <button type="button" className={styles.link} onClick={() => void leave()}>
          {COPY.pilsMatch.leave}
        </button>
      </div>
      {buddies.length > 0 && (
        <>
          <div className="t-label">{COPY.pilsMatch.buddies}</div>
          {buddies.map(row)}
        </>
      )}
      <div className="t-label">{COPY.pilsMatch.suggestions}</div>
      {others.map(row)}
      {people.length === 0 && <div className={styles.status}>{COPY.pilsMatch.empty}</div>}
      <p className={matches.privacy}>{COPY.pilsMatch.privacy}</p>
    </>
  )
}

/** Not visible yet: pick a name, become visible (switches device sync on – the ratings travel that way). */
function OptIn({ handle: known, onJoined }: { handle: string | null; onJoined: (feed: MatchFeed) => void }) {
  const { state, dispatch } = useApp()
  const { profile } = state
  const [handle, setHandle] = useState(known ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rated = Object.keys(profile.ratings).length > 0

  const join = async () => {
    const clean = cleanHandle(handle)
    if (!clean) return setError(COPY.pilsMatch.handleRule)
    setBusy(true)
    setError(null)
    try {
      const m = await loadMatch()
      const sent = profile.ratings
      const out = await m.becomeVisible(profile, clean)
      dispatch({ type: 'SYNC_APPLY', sent, result: out.ratings })
      if (!profile.sync.on) dispatch({ type: 'SET_SYNC', sync: { on: true } })
      onJoined(await m.loadFeed())
    } catch (e) {
      const kind = (e as { kind?: string }).kind
      setError(kind === 'code' ? COPY.pilsMatch.taken : kind === 'offline' ? COPY.pilsMatch.offline : COPY.pilsMatch.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className={matches.inviteBox}
      onSubmit={(e) => {
        e.preventDefault()
        void join()
      }}
    >
      <span className={matches.soonTitle}>{COPY.pilsMatch.title}</span>
      <span className={matches.soonSub}>{COPY.pilsMatch.intro}</span>
      {rated ? (
        <>
          <label className={styles.label}>
            {COPY.pilsMatch.handleLabel}
            <input
              className={styles.input}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={COPY.pilsMatch.handlePlaceholder}
              maxLength={25}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <span className={styles.hint}>{COPY.pilsMatch.handleRule}</span>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button size="md" block type="submit" disabled={busy} style={{ height: 52 }}>
            {busy ? COPY.pilsMatch.joining : COPY.pilsMatch.join}
          </Button>
          {!profile.sync.on && <span className={styles.hint}>{COPY.pilsMatch.syncNote}</span>}
        </>
      ) : (
        <div className={matches.note}>{COPY.pilsMatch.needRatings}</div>
      )}
    </form>
  )
}
