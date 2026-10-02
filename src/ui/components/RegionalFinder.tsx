import { ArrowSquareOutIcon, CrosshairIcon, MapPinIcon, NavigationArrowIcon, PlusCircleIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatAbv, rememberRegional } from '../../data/beers'
import { COPY, fill, pick } from '../../data/copy'
import { findPostcode, loadRegion, readPrefs, writePool, writePrefs } from '../../data/regional'
import type { RegionalPrefs, RegionLoad } from '../../data/regional'
import { hashId } from '../../domain/hash'
import { formatKm, RADII, rankRegional, routeUrl } from '../../domain/regional'
import type { LatLon, RegionalHit } from '../../domain/regional'
import type { RegionalBeerRow, RegionalBrewery } from '../../domain/regionalBeer'
import { toRegionalBeer } from '../../domain/regionalBeer'
import { compatibility } from '../../domain/matching'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { RATING_COLOR } from '../ratingStyle'
import { BeerBottle } from './BeerBottle'
import { BeerSubmitSheet } from './BeerSubmitSheet'
import { Sheet } from './Sheet'
import list from '../screens/Matches.module.css'
import styles from './RegionalFinder.module.css'

interface Origin extends LatLon {
  label: string
}

const PAGE = 15

const countLine = (n: number, b: number) =>
  fill(COPY.regional.count, { n, b, beers: COPY.regional.beerWord[n === 1 ? 0 : 1], breweries: COPY.regional.breweryWord[b === 1 ? 0 : 1] })

/** Browser position, coarse on purpose (no GPS warm-up needed); it stays in memory only. */
function locate(): Promise<LatLon> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unsupported'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

async function geoGranted(): Promise<boolean> {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'
  } catch {
    return false
  }
}

/**
 * Regional finder (Stufe R4): position or postcode → nearby breweries, their beers ranked by the user's
 * DNA. Used by the `regional` screen and the „Nähe“ segment in Matches.
 */
export function RegionalFinder() {
  const { state, rate, toast, openDetail } = useApp()
  const { dna } = useDerived()
  const [prefs, setPrefs] = useState<RegionalPrefs>(readPrefs)
  const [origin, setOrigin] = useState<Origin | null>(() => (prefs.mode === 'plz' && prefs.place ? prefs.place : null))
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<(RegionLoad & { query: string }) | null>(null)
  const [plz, setPlz] = useState('')
  const [more, setMore] = useState({ query: '', n: PAGE })
  const [open, setOpen] = useState<{ brewery: RegionalBrewery; km: number } | null>(null)
  // „Bier fehlt? Eintragen“ (R6): for the brewery of the sheet, or with a typed brewery
  const [report, setReport] = useState<{ brewery: { id: string; name: string } | null } | null>(null)
  const autoLocate = useRef(prefs.mode === 'geo')
  const query = origin ? `${origin.lat}|${origin.lon}|${prefs.radius}` : null
  const ready = !!loaded && loaded.query === query
  const shown = more.query === query ? more.n : PAGE

  const savePrefs = useCallback((p: Partial<RegionalPrefs>) => {
    setPrefs((old) => {
      const next = { ...old, ...p }
      writePrefs(next)
      return next
    })
  }, [])

  const locateMe = useCallback(async () => {
    setLocating(true)
    setError(null)
    try {
      const p = await locate()
      setOrigin({ ...p, label: COPY.regional.here })
      savePrefs({ mode: 'geo' })
    } catch (e) {
      setError((e as GeolocationPositionError).code === 1 ? COPY.regional.errDenied : COPY.regional.errPosition)
    } finally {
      setLocating(false)
    }
  }, [savePrefs])

  // a returning user who allowed the position before gets it again without a tap
  useEffect(() => {
    if (!autoLocate.current) return
    autoLocate.current = false
    void geoGranted().then((ok) => {
      if (ok) void locateMe()
    })
  }, [locateMe])

  const searchPlz = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const place = await findPostcode(plz)
      if (!place) return setError(COPY.regional.errPlz)
      setOrigin(place)
      savePrefs({ mode: 'plz', place })
    } catch {
      setError(COPY.regional.errNothing)
    }
  }

  useEffect(() => {
    if (!origin) return
    let live = true
    const q = `${origin.lat}|${origin.lon}|${prefs.radius}`
    void loadRegion(origin, prefs.radius).then((r) => live && setLoaded({ ...r, query: q }))
    return () => {
      live = false
    }
  }, [origin, prefs.radius])

  const result = useMemo(
    () => (origin && ready ? rankRegional(dna.taste, loaded.breweries, origin, prefs.radius) : null),
    [dna.taste, loaded, ready, origin, prefs.radius],
  )
  // R5: the result is the pool the Regional-Modus mixes into the swipe deck
  useEffect(() => {
    if (!result) return
    writePool(
      result.beers.flatMap((h) => {
        const row = h.brewery.beers.find((b) => b.id === h.beer.id)
        return row ? [{ row, brewery: h.brewery, km: h.km }] : []
      }),
    )
  }, [result])
  const notice = error ?? (ready && loaded.offline ? (loaded.breweries.length ? COPY.regional.errOffline : COPY.regional.errNothing) : null)
  const ratings = state.profile.ratings

  const show = (row: RegionalBeerRow, brewery: RegionalBrewery) => openDetail(rememberRegional(row, brewery).id)
  const putOnList = (row: RegionalBeerRow, brewery: RegionalBrewery) => {
    const beer = rememberRegional(row, brewery)
    if (rate(beer.id, 'WANT_TO_TRY').length) return
    toast(fill(pick(COPY.quips.WANT_TO_TRY, hashId(beer.id)), { name: beer.name }), RATING_COLOR.WANT_TO_TRY)
  }
  const tag = (h: RegionalHit) => (ratings[h.beer.id] ? COPY.rating[ratings[h.beer.id].rating].label : COPY.regional.estimate)

  return (
    <div className={styles.finder}>
      <div className={styles.where}>
        <button type="button" className={styles.locate} onClick={locateMe} disabled={locating}>
          <CrosshairIcon weight="bold" />
          {locating ? COPY.regional.locating : COPY.regional.locate}
        </button>
        <form className={styles.plz} onSubmit={searchPlz}>
          <input
            className={styles.plzInput}
            inputMode="numeric"
            pattern="[0-9]{4,5}"
            maxLength={5}
            placeholder={COPY.regional.plz}
            aria-label={COPY.regional.plz}
            value={plz}
            onChange={(e) => setPlz(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" className={styles.plzGo} disabled={plz.length < 4}>
            {COPY.regional.plzGo}
          </button>
        </form>
      </div>

      <div className={styles.radii} role="radiogroup" aria-label={COPY.regional.radius}>
        {RADII.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={prefs.radius === r}
            className={`${styles.radius} ${prefs.radius === r ? styles.radiusOn : ''}`}
            onClick={() => savePrefs({ radius: r })}
          >
            {r} km
          </button>
        ))}
      </div>

      <label className={styles.deckToggle}>
        <input type="checkbox" checked={prefs.deck} onChange={(e) => savePrefs({ deck: e.target.checked })} />
        <span>
          <strong>{COPY.regional.deckMode}</strong>
          <span className={styles.deckHint}>{COPY.regional.deckModeHint}</span>
        </span>
      </label>

      {notice && (
        <div className={styles.error} role="status">
          {notice}
        </div>
      )}

      {!origin && !locating && <div className={styles.start}>{COPY.regional.start}</div>}

      {origin && (
        <div className={styles.origin}>
          <MapPinIcon weight="fill" />
          <span>{origin.label === COPY.regional.here ? origin.label : fill(COPY.regional.near, { place: origin.label })}</span>
        </div>
      )}

      {origin && !ready && <div className={styles.loading}>{COPY.regional.loading}</div>}

      {result && (
        <>
          <div className="t-label">
            {countLine(result.beers.length, new Set(result.beers.map((h) => h.brewery.id)).size + result.breweries.length)}
          </div>
          <p className={styles.note}>{COPY.regional.estimateNote}</p>
          {result.beers.slice(0, shown).map((h) => (
            <button key={h.beer.id} type="button" className={list.reco} onClick={() => setOpen({ brewery: h.brewery, km: h.km })}>
              <span className={list.bottle} style={{ background: h.beer.color }}>
                <BeerBottle beer={h.beer} size={50} />
              </span>
              <span className={list.recoText}>
                <span className={`${list.recoName} ${styles.name}`}>{h.beer.name}</span>
                <span className={list.recoMeta}>
                  {h.brewery.name} · {formatKm(h.km)}
                </span>
              </span>
              <span className={list.recoRight}>
                <span className={list.recoPct}>{h.pct} %</span>
                <span className={list.recoTag}>{tag(h)}</span>
              </span>
            </button>
          ))}
          {result.beers.length > shown && (
            <button type="button" className={styles.more} onClick={() => setMore({ query: query ?? '', n: shown + PAGE })}>
              {COPY.regional.more}
            </button>
          )}

          {result.breweries.length > 0 && (
            <>
              <div className="t-label">{fill(COPY.regional.without, { n: result.breweries.length })}</div>
              <p className={styles.note}>{COPY.regional.withoutNote}</p>
              <div className={styles.plain}>
                {result.breweries.slice(0, 30).map((h) => (
                  <button key={h.brewery.id} type="button" className={styles.plainRow} onClick={() => setOpen(h)}>
                    <span className={styles.plainName}>{h.brewery.name}</span>
                    <span className={styles.plainMeta}>
                      {h.brewery.city ?? ''} · {formatKm(h.km)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {result.beers.length + result.breweries.length === 0 && <div className={styles.start}>{COPY.regional.empty}</div>}
          <button type="button" className={styles.more} onClick={() => setReport({ brewery: null })}>
            <PlusCircleIcon weight="bold" /> {COPY.submit.entryAny}
          </button>
        </>
      )}

      {open && (
        <Sheet title={open.brewery.name} onClose={() => setOpen(null)}>
          <div className={styles.sheetMeta}>
            {[open.brewery.city, formatKm(open.km), open.brewery.founded ? fill(COPY.regional.since, { year: open.brewery.founded }) : null]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <div className={styles.links}>
            <a className={styles.link} href={routeUrl(open.brewery)} target="_blank" rel="noopener noreferrer">
              <NavigationArrowIcon weight="bold" /> {COPY.regional.route}
            </a>
            {open.brewery.website && (
              <a className={styles.link} href={open.brewery.website} target="_blank" rel="noopener noreferrer">
                <ArrowSquareOutIcon weight="bold" /> {COPY.regional.website}
              </a>
            )}
          </div>
          <span className="t-label">{COPY.regional.sheetBeers}</span>
          {open.brewery.beers.length === 0 && <p className={styles.note}>{COPY.regional.sheetNone}</p>}
          {open.brewery.beers.map((row) => {
            const beer = toRegionalBeer(row, open.brewery)
            const onList = ratings[beer.id]?.rating === 'WANT_TO_TRY'
            return (
              <div key={row.id} className={styles.sheetBeer}>
                <button type="button" className={styles.sheetOpen} onClick={() => show(row, open.brewery)}>
                  <span className={list.bottle} style={{ background: beer.color }}>
                    <BeerBottle beer={beer} size={50} />
                  </span>
                  <span className={list.recoText}>
                    <span className={`${list.recoName} ${styles.name}`}>{beer.name}</span>
                    <span className={list.recoMeta}>
                      {beer.style} · {formatAbv(beer.abv)}
                    </span>
                    <span className={styles.sheetPct}>{fill(COPY.regional.match, { pct: compatibility(dna.taste, beer.taste) })}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.tryBtn} ${onList ? styles.tryOn : ''}`}
                  onClick={() => putOnList(row, open.brewery)}
                  disabled={onList}
                >
                  {onList ? COPY.regional.onList : COPY.regional.tryCta}
                </button>
              </div>
            )
          })}
          <button
            type="button"
            className={styles.more}
            onClick={() => {
              setReport({ brewery: { id: open.brewery.id, name: open.brewery.name } })
              setOpen(null)
            }}
          >
            <PlusCircleIcon weight="bold" /> {COPY.submit.entry}
          </button>
        </Sheet>
      )}

      {report && <BeerSubmitSheet brewery={report.brewery} onClose={() => setReport(null)} />}
    </div>
  )
}
