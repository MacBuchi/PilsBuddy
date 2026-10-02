import { ArrowLeftIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { BEER_BY_ID, formatAbv, rememberRegional } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { findPostcode, searchNear, searchRegional } from '../../data/regional'
import type { RegionalFound } from '../../data/regional'
import { ABV_BANDS, filterLibrary, groupCounts, isPostcode, matchesFilter, NO_FILTER, STYLE_GROUPS } from '../../domain/library'
import type { LibraryFilter, RatingFilter } from '../../domain/library'
import { toRegionalBeer } from '../../domain/regionalBeer'
import { RATINGS } from '../../domain/types'
import type { Beer } from '../../domain/types'
import { useApp } from '../../state/AppContext'
import { BeerBottle } from '../components/BeerBottle'
import list from './Matches.module.css'
import finder from '../components/RegionalFinder.module.css'
import legal from './Legal.module.css'
import page from './page.module.css'
import styles from './Library.module.css'

const PAGE = 40
const RADIUS = 25
const RATING_FILTERS: readonly RatingFilter[] = [...RATINGS, 'unrated']

/** Filters survive opening a beer and coming back (memory only – navigation is not persisted). */
let kept: LibraryFilter = NO_FILTER

type Remote =
  | { state: 'idle' }
  | { state: 'loading'; query: string }
  | { state: 'done'; query: string; found: RegionalFound[]; place: string | null }
  | { state: 'error'; query: string; text: string }

const beerWord = (n: number) => COPY.regional.beerWord[n === 1 ? 0 : 1]

/**
 * Bierbibliothek (R8): every beer the app carries (curated + regional ones the user touched), offline,
 * plus – for a typed name or postcode – regional beers from the API. Opened from Matches.
 */
export function Library() {
  const { state, go, openDetail } = useApp()
  const [filter, setFilterState] = useState<LibraryFilter>(kept)
  const [shown, setShown] = useState(PAGE)
  const [remote, setRemote] = useState<Remote>({ state: 'idle' })
  const ratings = state.profile.ratings

  const setFilter = (p: Partial<LibraryFilter>) => {
    setFilterState((old) => (kept = { ...old, ...p }))
    setShown(PAGE)
  }

  const local = useMemo(() => Object.values(BEER_BY_ID), [])
  const hits = useMemo(() => filterLibrary(local, filter, ratings), [local, filter, ratings])
  const counts = useMemo(() => groupCounts(local, filter, ratings), [local, filter, ratings])
  const query = filter.query.trim()
  const wantRemote = isPostcode(query) || query.replace(/[^\p{L}\p{N}]/gu, '').length >= 3

  // regional breweries: after a short pause in typing, by name or around a postcode
  useEffect(() => {
    if (!wantRemote) return
    let live = true
    const t = setTimeout(() => {
      setRemote({ state: 'loading', query })
      const run = async (): Promise<Remote> => {
        if (!isPostcode(query)) return { state: 'done', query, found: await searchRegional(query), place: null }
        const place = await findPostcode(query)
        if (!place) return { state: 'error', query, text: COPY.library.noPlz }
        return { state: 'done', query, found: await searchNear(place, RADIUS), place: place.label }
      }
      run()
        .catch((): Remote => ({ state: 'error', query, text: COPY.library.regionalOffline }))
        .then((r) => live && setRemote(r))
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [query, wantRemote])

  // the API already matched the text (also on brewery and town) – the other filters apply here
  const regional = useMemo(() => {
    if (!wantRemote || remote.state !== 'done' || remote.query !== query) return []
    const known = new Set(hits.map((b) => b.id))
    const all: { beer: Beer; item: RegionalFound }[] = remote.found
      .filter((f) => !known.has(f.row.id))
      .map((item) => ({ beer: toRegionalBeer(item.row, item.brewery), item }))
    return all
      .filter(({ beer }) => matchesFilter(beer, { ...filter, query: '' }, ratings))
      .sort((a, b) => a.beer.name.localeCompare(b.beer.name, 'de') || a.beer.id.localeCompare(b.beer.id))
  }, [wantRemote, remote, query, hits, filter, ratings])

  const filtered = filter.group || filter.abv || filter.rating || query
  const tag = (b: Beer) => (ratings[b.id] ? COPY.rating[ratings[b.id].rating].short : formatAbv(b.abv))

  const row = (beer: Beer, onClick: () => void, meta: string) => (
    <button key={beer.id} type="button" className={list.reco} onClick={onClick}>
      <span className={list.bottle} style={{ background: beer.color }}>
        <BeerBottle beer={beer} size={50} />
      </span>
      <span className={list.recoText}>
        <span className={`${list.recoName} ${styles.name}`}>{beer.name}</span>
        <span className={list.recoMeta}>{meta}</span>
      </span>
      <span className={list.recoRight}>
        <span className={list.recoTag}>{tag(beer)}</span>
      </span>
    </button>
  )

  const chip = (on: boolean, label: string, onClick: () => void, count?: number) => (
    <button key={label} type="button" aria-pressed={on} className={`${styles.chip} ${on ? styles.chipOn : ''}`} onClick={onClick}>
      {label}
      {count !== undefined && <span className={styles.chipCount}>{count}</span>}
    </button>
  )

  return (
    <div className={page.page} style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div className={legal.head}>
        <button type="button" className={legal.back} onClick={() => go('matches')} aria-label={COPY.legal.back}>
          <ArrowLeftIcon weight="bold" />
        </button>
        <h1 className={legal.title}>{COPY.library.title}</h1>
      </div>

      <label className={styles.search}>
        <MagnifyingGlassIcon weight="bold" size={20} />
        <input
          className={styles.searchInput}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          placeholder={COPY.library.search}
          aria-label={COPY.library.search}
          value={filter.query}
          maxLength={60}
          onChange={(e) => setFilter({ query: e.target.value })}
        />
        {filter.query && (
          <button type="button" className={styles.clear} onClick={() => setFilter({ query: '' })} aria-label={COPY.library.clear}>
            <XIcon weight="bold" size={18} />
          </button>
        )}
      </label>

      <div className={styles.chips} role="group" aria-label={COPY.library.title}>
        {chip(!filter.group, COPY.library.all, () => setFilter({ group: null }))}
        {STYLE_GROUPS.map((g) => chip(filter.group === g, COPY.library.groups[g], () => setFilter({ group: filter.group === g ? null : g }), counts[g]))}
      </div>

      <span className={`t-label ${styles.filterLabel}`}>{COPY.library.abvLabel}</span>
      <div className={styles.chips} role="group" aria-label={COPY.library.abvLabel}>
        {ABV_BANDS.map((a) => chip(filter.abv === a, COPY.library.abv[a], () => setFilter({ abv: filter.abv === a ? null : a })))}
      </div>

      <span className={`t-label ${styles.filterLabel}`}>{COPY.library.ratingLabel}</span>
      <div className={styles.chips} role="group" aria-label={COPY.library.ratingLabel}>
        {RATING_FILTERS.map((r) =>
          chip(filter.rating === r, r === 'unrated' ? COPY.library.unrated : COPY.rating[r].short, () => setFilter({ rating: filter.rating === r ? null : r })),
        )}
      </div>

      <div className={styles.countRow}>
        <span className="t-label">{fill(COPY.library.count, { n: hits.length, beers: beerWord(hits.length) })}</span>
        {filtered && (
          <button type="button" className={styles.reset} onClick={() => setFilter(NO_FILTER)}>
            {COPY.library.reset}
          </button>
        )}
      </div>

      {hits.slice(0, shown).map((b) => row(b, () => openDetail(b.id), `${b.style} · ${b.brewery}`))}
      {hits.length > shown && (
        <button type="button" className={finder.more} onClick={() => setShown(shown + PAGE)}>
          {COPY.library.more}
        </button>
      )}
      {hits.length === 0 && <div className={page.dashed}>{COPY.library.empty}</div>}

      {!wantRemote && <p className={finder.note} style={{ margin: 0 }}>{COPY.library.regionalHint}</p>}
      {wantRemote && (remote.state === 'idle' || remote.state === 'loading' || remote.query !== query) && (
        <div className={finder.loading}>{COPY.library.regionalLoading}</div>
      )}
      {wantRemote && remote.state === 'error' && remote.query === query && (
        <div className={finder.error} role="status">
          {remote.text}
        </div>
      )}
      {wantRemote && remote.state === 'done' && remote.query === query && (
        <>
          <div className="t-label">
            {remote.place ? fill(COPY.library.regionalNear, { place: remote.place, n: regional.length }) : fill(COPY.library.regional, { n: regional.length })}
          </div>
          {regional.length > 0 && <p className={finder.note}>{COPY.regional.estimateNote}</p>}
          {regional.map(({ beer, item }) =>
            row(beer, () => openDetail(rememberRegional(item.row, item.brewery).id), `${item.brewery.name} · ${item.brewery.city ?? beer.region}`),
          )}
          {regional.length === 0 && <div className={finder.start}>{COPY.library.regionalNone}</div>}
        </>
      )}
    </div>
  )
}
