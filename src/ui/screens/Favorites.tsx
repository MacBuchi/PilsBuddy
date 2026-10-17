import { ArrowLeftIcon, BeerBottleIcon, CheckIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { BEER_BY_ID, rememberRegional } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { searchRegional } from '../../data/regional'
import type { RegionalFound } from '../../data/regional'
import { favoriteRatings, FAVORITE_HITS, MAX_FAVORITES, searchFavorites } from '../../domain/favorites'
import { swipeable } from '../../domain/quality'
import { toRegionalBeer } from '../../domain/regionalBeer'
import type { Beer } from '../../domain/types'
import { useApp } from '../../state/AppContext'
import { BeerBottle } from '../components/BeerBottle'
import { BeerSubmitSheet } from '../components/BeerSubmitSheet'
import { Button } from '../components/Button'
import list from './Matches.module.css'
import finder from '../components/RegionalFinder.module.css'
import legal from './Legal.module.css'
import page from './page.module.css'
import lib from './Library.module.css'

interface Pick {
  beer: Beer
  /** regional beers are remembered (snapshot) only when the user goes on with them */
  item?: RegionalFound
}

type Remote = { state: 'idle' | 'loading' | 'error'; query: string } | { state: 'done'; query: string; found: RegionalFound[] }

/**
 * V3 – before the reference set: „Was trinkst du gern?“. Search the curated beers (offline) and, from three letters
 * on, the regional catalogue; up to five favourites count as „Mag ich“. A beer that is not there goes to „Bier melden“.
 */
export function Favorites() {
  const { state, dispatch, go } = useApp()
  // after onboarding the screen is reached from the profile (2026-10-17: favourites any time) and returns there
  const later = state.profile.onboarded
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Pick[]>([])
  const [remote, setRemote] = useState<Remote>({ state: 'idle', query: '' })
  const [reporting, setReporting] = useState(false)
  const q = query.trim()
  const wantRemote = q.replace(/[^\p{L}\p{N}]/gu, '').length >= 3

  const curated = useMemo(() => Object.values(BEER_BY_ID).filter((b) => !b.regional), [])
  const local = useMemo(() => searchFavorites(curated, q), [curated, q])

  useEffect(() => {
    if (!wantRemote) return
    let live = true
    const t = setTimeout(() => {
      setRemote({ state: 'loading', query: q })
      searchRegional(q)
        .then((found): Remote => ({ state: 'done', query: q, found }))
        .catch((): Remote => ({ state: 'error', query: q }))
        .then((r) => live && setRemote(r))
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q, wantRemote])

  const regional = useMemo(() => {
    if (!wantRemote || remote.state !== 'done' || remote.query !== q) return []
    return remote.found
      .map((item) => ({ beer: toRegionalBeer(item.row, item.brewery), item }))
      .filter(({ beer }) => swipeable(beer))
      .slice(0, FAVORITE_HITS)
  }, [wantRemote, remote, q])

  const isPicked = (id: string) => picked.some((p) => p.beer.id === id)
  const full = picked.length >= MAX_FAVORITES
  const toggle = (p: Pick) =>
    setPicked((old) => (old.some((o) => o.beer.id === p.beer.id) ? old.filter((o) => o.beer.id !== p.beer.id) : old.length >= MAX_FAVORITES ? old : [...old, p]))

  const finish = () => {
    const ids = favoriteRatings(
      picked.map((p) => (p.item ? rememberRegional(p.item.row, p.item.brewery).id : p.beer.id)),
      state.profile.ratings,
    )
    const at = Date.now()
    ids.forEach((id, i) => dispatch({ type: 'RATE', id, rating: 'LIKE', at: at + i }))
    go(later ? 'profile' : 'swipe')
  }

  const row = (p: Pick, meta: string) => {
    const on = isPicked(p.beer.id)
    return (
      <button
        key={p.beer.id}
        type="button"
        role="checkbox"
        aria-checked={on}
        className={list.reco}
        disabled={!on && full}
        style={!on && full ? { opacity: 0.45 } : undefined}
        onClick={() => toggle(p)}
      >
        <span className={list.bottle} style={{ background: p.beer.color }}>
          <BeerBottle beer={p.beer} size={50} />
        </span>
        <span className={list.recoText}>
          <span className={list.recoName}>{p.beer.name}</span>
          <span className={list.recoMeta}>{meta}</span>
        </span>
        <span className={list.recoRight}>{on ? <CheckIcon weight="bold" size={22} /> : null}</span>
      </button>
    )
  }

  const searched = wantRemote && remote.query === q && (remote.state === 'done' || remote.state === 'error')
  return (
    <div className={page.page} style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div className={legal.head}>
        <button type="button" className={legal.back} onClick={() => go(later ? 'profile' : 'howto')} aria-label={COPY.nav.back}>
          <ArrowLeftIcon weight="bold" />
        </button>
        {!later && <span className="t-label">{COPY.favorites.step}</span>}
      </div>
      <h1 className={legal.title} style={{ margin: 0 }}>
        {later ? COPY.favorites.later : COPY.favorites.title}
      </h1>
      <p className={finder.note} style={{ margin: 0 }}>
        {later ? COPY.favorites.laterSub : COPY.favorites.sub}
      </p>

      <label className={lib.search}>
        <MagnifyingGlassIcon weight="bold" size={20} />
        <input
          className={lib.searchInput}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          placeholder={COPY.favorites.search}
          aria-label={COPY.favorites.search}
          value={query}
          maxLength={60}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className={lib.clear} onClick={() => setQuery('')} aria-label={COPY.favorites.clear}>
            <XIcon weight="bold" size={18} />
          </button>
        )}
      </label>

      {picked.length > 0 && (
        <>
          <span className="t-label">{fill(COPY.favorites.picked, { n: picked.length, max: MAX_FAVORITES })}</span>
          <div className={lib.chips}>
            {picked.map((p) => (
              <button
                key={p.beer.id}
                type="button"
                className={`${lib.chip} ${lib.chipOn}`}
                aria-label={fill(COPY.favorites.remove, { name: p.beer.name })}
                onClick={() => toggle(p)}
              >
                {p.beer.name} <XIcon weight="bold" size={12} />
              </button>
            ))}
          </div>
          {full && <p className={finder.note}>{COPY.favorites.full}</p>}
        </>
      )}

      {local.map((b) => row({ beer: b }, `${b.style} · ${b.brewery}`))}
      {wantRemote && !searched && <div className={finder.loading}>{COPY.favorites.searching}</div>}
      {searched && remote.state === 'error' && (
        <div className={finder.error} role="status">
          {COPY.favorites.offline}
        </div>
      )}
      {regional.map(({ beer, item }) => row({ beer, item }, `${item.brewery.name} · ${item.brewery.city ?? beer.region}`))}
      {searched && (
        <div className={finder.start}>
          {fill(COPY.favorites.missing, { name: q })}{' '}
          <button type="button" className={finder.radius} onClick={() => setReporting(true)}>
            {COPY.favorites.missingCta}
          </button>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <Button block onClick={finish}>
        {later
          ? COPY.favorites.save
          : picked.length
            ? fill(COPY.favorites.go, { n: picked.length, fav: COPY.favorites.favWord[picked.length === 1 ? 0 : 1] })
            : COPY.favorites.goNone}{' '}
        <BeerBottleIcon weight="bold" />
      </Button>
      {reporting && <BeerSubmitSheet beerName={q} onClose={() => setReporting(false)} />}
    </div>
  )
}
