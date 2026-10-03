import { ArrowLeftIcon, CrosshairIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY, fill } from '../../data/copy'
import { loadBrewery, loadBreweryMap, readPrefs } from '../../data/regional'
import type { MapBrewery, MapLoad } from '../../data/regional'
import { BORDERS, LAND } from '../../data/world'
import type { LatLon } from '../../domain/geo'
import { haversineKm } from '../../domain/geo'
import type { RegionalBrewery } from '../../domain/regionalBeer'
import { preferredCountries } from '../../domain/postcode'
import { boundsOf, clampView, clusterPoints, fitBounds, project, toScreen, viewAround, zoomAt } from '../../domain/worldMap'
import type { MapPoint, Pt, Size, View } from '../../domain/worldMap'
import { useApp } from '../../state/AppContext'
import { LANG } from '../../state/lang'
import { BeerSubmitSheet } from '../components/BeerSubmitSheet'
import { BrewerySheet } from '../components/BrewerySheet'
import { geoGranted, locate } from '../locate'
import styles from './BreweryMap.module.css'

interface Me extends LatLon {
  /** A typed postcode („74906 Bad Rappenau“); null for the browser position. */
  label: string | null
}

/** Around the user: about this far in each direction. */
const NEAR_KM = 60
/** A finger that moved more than this is panning, not tapping. */
const TAP_PX = 8

/** Cluster label: 1,2k / 1.2k – short enough for the bubble. */
const short = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString(LANG, { maximumFractionDigits: n >= 10000 ? 0 : 1 })}k` : String(n))
/** The PilsBuddy glass from the app icon (public/favicon.svg) without its tile – the map's brewery marker. */
function Glass() {
  return (
    <svg className={styles.glass} viewBox="15 6 34 52" aria-hidden="true">
      <rect x="17" y="18" width="30" height="38" rx="5" fill="var(--ink-fixed)" />
      <rect x="20" y="21" width="24" height="32" rx="3" fill="var(--gold)" />
      <rect x="20" y="21" width="24" height="7" rx="3" fill="var(--foam)" />
      <circle cx="24" cy="17" r="6" fill="var(--ink-fixed)" />
      <circle cx="32" cy="14" r="7" fill="var(--ink-fixed)" />
      <circle cx="40" cy="17" r="6" fill="var(--ink-fixed)" />
      <circle cx="24" cy="17" r="4" fill="var(--foam)" />
      <circle cx="32" cy="14" r="5" fill="var(--foam)" />
      <circle cx="40" cy="17" r="4" fill="var(--foam)" />
      <circle cx="27" cy="36" r="2" fill="var(--ink-fixed)" />
      <circle cx="37" cy="36" r="2" fill="var(--ink-fixed)" />
      <path d="M28 43q4 3 8 0" stroke="var(--ink-fixed)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * World map of all breweries (Fahrplan: Weltkarte). The outline ships with the app (Natural Earth), the brewery
 * list is fetched once and cached for 30 days – no position is ever sent, and no tile server sees where you look.
 * Tap a cluster to zoom in, a dot for the brewery sheet. Opened from the finder (Nähe).
 */
export default function BreweryMap() {
  const { state, go, toast } = useApp()
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size | null>(null)
  const [view, setView] = useState<View | null>(null)
  const [data, setData] = useState<MapLoad | null>(null)
  const [me, setMe] = useState<Me | null>(() => {
    const p = readPrefs()
    return p.mode === 'plz' && p.place ? { lat: p.place.lat, lon: p.place.lon, label: p.place.label } : null
  })
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [open, setOpen] = useState<{ brewery: RegionalBrewery; km: number | null } | null>(null)
  const [report, setReport] = useState<{ id: string; name: string } | null>(null)
  const anim = useRef(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let live = true
    void loadBreweryMap().then((d) => live && setData(d))
    return () => {
      live = false
    }
  }, [])

  const points = useMemo<MapPoint[]>(() => (data?.breweries ?? []).map((b) => ({ id: b.id, ...project(b) })), [data])
  const byId = useMemo(() => new Map((data?.breweries ?? []).map((b) => [b.id, b])), [data])

  // until the user moves the map, it follows the data: around the user if known, else all breweries
  const initial = useMemo(() => {
    if (!size || !data) return null
    if (me) return viewAround(me, NEAR_KM, size)
    // no position: the browser's country (de-AT → Austria), else everything
    const home = preferredCountries(navigator.language)[0]
    const b = boundsOf(points.filter((p) => byId.get(p.id)?.country === home)) ?? boundsOf(points)
    return b ? fitBounds(b, size, 24) : clampView({ x: 500, y: 400, scale: 0 }, size)
  }, [size, data, me, points, byId])
  const current = size && view ? clampView(view, size) : initial

  const animateTo = useCallback(
    (target: View) => {
      cancelAnimationFrame(anim.current)
      if (!current || reducedMotion()) return setView(target)
      const from = current
      const t0 = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / 320)
        const e = 1 - (1 - t) ** 3
        // scale interpolates in log space, the centre follows the zoom so the target stays in view
        setView({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          scale: from.scale * (target.scale / from.scale) ** e,
        })
        if (t < 1) anim.current = requestAnimationFrame(step)
      }
      anim.current = requestAnimationFrame(step)
    },
    [current],
  )
  useEffect(() => () => cancelAnimationFrame(anim.current), [])

  const locateMe = useCallback(
    async (center: boolean) => {
      setLocating(true)
      setError(null)
      try {
        const p = await locate()
        setMe({ ...p, label: null })
        // untouched, the map follows `me` by itself (see `initial`)
        if (center && size) animateTo(viewAround(p, NEAR_KM, size))
      } catch (e) {
        setError((e as GeolocationPositionError).code === 1 ? COPY.regional.errDenied : COPY.regional.errPosition)
      } finally {
        setLocating(false)
      }
    },
    [animateTo, size],
  )

  // a user who allowed the position before (finder: „Mein Standort“) sees it without a tap
  const autoLocate = useRef(readPrefs().mode === 'geo')
  useEffect(() => {
    if (!autoLocate.current || !size) return
    autoLocate.current = false
    void geoGranted().then((ok) => ok && void locateMe(false))
  }, [locateMe, size])

  /* ---------- gestures: drag, pinch, wheel, keys ---------- */

  const pointers = useRef(new Map<number, Pt>())
  const moved = useRef(0)

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = box.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(anim.current)
    if (pointers.current.size === 0) moved.current = 0
    pointers.current.set(e.pointerId, local(e))
  }

  /** Several events can arrive before the next render – each one builds on the latest view, not a stale one. */
  const moveView = useCallback(
    (f: (v: View, size: Size) => View) => {
      if (!size) return
      setView((v) => {
        const base = v ? clampView(v, size) : initial
        return base ? clampView(f(base, size), size) : v
      })
    },
    [size, initial],
  )

  const onPointerMove = (e: React.PointerEvent) => {
    const old = pointers.current.get(e.pointerId)
    if (!old) return
    const now = local(e)
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p)
    pointers.current.set(e.pointerId, now)
    moved.current += Math.hypot(now.x - old.x, now.y - old.y)
    if (moved.current > TAP_PX && !box.current!.hasPointerCapture(e.pointerId)) box.current!.setPointerCapture(e.pointerId)
    if (others.length === 0) {
      moveView((v) => ({ ...v, x: v.x - (now.x - old.x) / v.scale, y: v.y - (now.y - old.y) / v.scale }))
      return
    }
    // pinch: zoom around the midpoint by the change of the finger distance, pan with the midpoint
    const o = others[0]
    const before = Math.hypot(old.x - o.x, old.y - o.y)
    const after = Math.hypot(now.x - o.x, now.y - o.y)
    const mid = { x: (now.x + o.x) / 2, y: (now.y + o.y) / 2 }
    const pan = { x: (now.x - old.x) / 2, y: (now.y - old.y) / 2 }
    moveView((v, sz) => {
      const z = zoomAt(v, before > 0 ? after / before : 1, mid, sz)
      return { ...z, x: z.x - pan.x / z.scale, y: z.y - pan.y / z.scale }
    })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
  }

  // wheel needs a non-passive listener to keep the page from scrolling
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cancelAnimationFrame(anim.current)
      const at = local(e)
      moveView((v, sz) => zoomAt(v, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), at, sz))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [moveView])

  const zoomBy = (f: number) => {
    if (!current || !size) return
    animateTo(zoomAt(current, f, { x: size.w / 2, y: size.h / 2 }, size))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    const pan: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (pan[e.key]) {
      e.preventDefault()
      const [dx, dy] = pan[e.key]
      moveView((v) => ({ ...v, x: v.x + (dx * 80) / v.scale, y: v.y + (dy * 80) / v.scale }))
    } else if (e.key === '+' || e.key === '=') zoomBy(2)
    else if (e.key === '-') zoomBy(0.5)
  }

  /* ---------- markers ---------- */

  const markers = useMemo(() => (current && size ? clusterPoints(points, current, size) : []), [points, current, size])

  const openBrewery = async (b: MapBrewery) => {
    if (moved.current > TAP_PX || opening) return
    setOpening(b.id)
    try {
      const full = await loadBrewery(b)
      if (!full) return toast(COPY.map.missing)
      setOpen({ brewery: full, km: me ? haversineKm(me, full) : null })
    } finally {
      setOpening(null)
    }
  }

  const zoomTo = (m: { box: { x0: number; y0: number; x1: number; y1: number } }) => {
    if (moved.current > TAP_PX || !size) return
    animateTo(fitBounds(m.box, size, 64))
  }

  const meAt = me && current && size ? toScreen(project(me), current, size) : null
  const notice = error ?? (data?.offline ? (data.breweries.length ? COPY.map.offline : COPY.map.offlineEmpty) : null)
  const transform = current && size ? `translate(${size.w / 2 - current.x * current.scale} ${size.h / 2 - current.y * current.scale}) scale(${current.scale / 10})` : undefined

  return (
    <div className={styles.screen}>
      <div
        ref={box}
        className={styles.map}
        tabIndex={0}
        role="application"
        aria-label={COPY.map.title}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <svg className={styles.svg} aria-hidden="true">
          {transform && (
            <g transform={transform}>
              <path className={styles.land} d={LAND} />
              <path className={styles.borders} d={BORDERS} />
            </g>
          )}
        </svg>
        <div className={styles.markers}>
          {markers.map((m) => {
            if (m.kind === 'many') {
              const h = Math.round(30 + Math.min(18, Math.log10(m.n) * 6))
              return (
                <button
                  key={m.key}
                  type="button"
                  className={styles.cluster}
                  style={{ transform: `translate(${m.x}px, ${m.y}px)`, height: h, width: (h * 34) / 52, marginLeft: (-h * 17) / 52, marginTop: -h / 2 }}
                  aria-label={fill(COPY.map.cluster, { n: m.n })}
                  onClick={() => zoomTo(m)}
                >
                  <Glass />
                  <span className={styles.count}>{short(m.n)}</span>
                </button>
              )
            }
            const b = byId.get(m.id)!
            return (
              <button
                key={m.id}
                type="button"
                className={`${styles.dot} ${opening === m.id ? styles.dotBusy : ''}`}
                style={{ transform: `translate(${m.x}px, ${m.y}px)` }}
                aria-label={b.name}
                title={b.name}
                onClick={() => void openBrewery(b)}
              >
                <Glass />
              </button>
            )
          })}
          {meAt && (
            <span className={styles.me} style={{ transform: `translate(${meAt.x}px, ${meAt.y}px)` }} role="img" aria-label={me?.label ?? COPY.map.me}>
              <span className={styles.meHalo} />
            </span>
          )}
        </div>
      </div>

      <div className={styles.head}>
        <button type="button" className={styles.round} onClick={() => go(state.mapFrom)} aria-label={COPY.legal.back}>
          <ArrowLeftIcon weight="bold" />
        </button>
        <div className={styles.titleBox}>
          <h1 className={styles.title}>{COPY.map.title}</h1>
          <span className={styles.sub}>
            {data
              ? fill(COPY.map.count, { n: data.breweries.length.toLocaleString(LANG), breweries: COPY.regional.breweryWord[data.breweries.length === 1 ? 0 : 1] })
              : COPY.map.loading}
          </span>
        </div>
      </div>

      {notice && (
        <div className={styles.notice} role="status">
          {notice}
        </div>
      )}

      <div className={styles.tools}>
        <button type="button" className={styles.round} onClick={() => zoomBy(2)} aria-label={COPY.map.zoomIn}>
          <PlusIcon weight="bold" />
        </button>
        <button type="button" className={styles.round} onClick={() => zoomBy(0.5)} aria-label={COPY.map.zoomOut}>
          <MinusIcon weight="bold" />
        </button>
        <button type="button" className={`${styles.round} ${styles.locate}`} onClick={() => void locateMe(true)} disabled={locating} aria-label={COPY.regional.locate}>
          <CrosshairIcon weight="bold" />
        </button>
      </div>

      <div className={styles.credit}>
        {COPY.map.hint} · {COPY.map.credit}
      </div>

      {open && (
        <BrewerySheet
          brewery={open.brewery}
          km={open.km}
          onClose={() => setOpen(null)}
          onReport={(b) => {
            setReport(b)
            setOpen(null)
          }}
        />
      )}
      {report && <BeerSubmitSheet brewery={report} onClose={() => setReport(null)} />}
    </div>
  )
}
