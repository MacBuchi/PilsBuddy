import type { CSSProperties } from 'react'
import type { ArchetypeId } from '../../domain/types'

/**
 * Parametric "Glas-Charakter" avatar (Designsystem §2a). Built from shapes, not drawn:
 * glass form (archetype), beer colour, foam bumps, eyes/mouth, accessory.
 * Evolution: < 30 % decoded → silhouette with "?", ≥ 70 % → accessory unlocked.
 * Ink/foam colours are fixed on purpose – the avatar always sits on gold or cream.
 */

type Eyes = 'Dot' | 'Flat' | 'Happy' | 'Wide' | 'Shades' | 'Wink' | 'Curious' | 'Specs'
type Mouth = 'Smile' | 'Line' | 'O' | 'Grin'
type Accessory = '' | 'Brow' | 'Must' | 'Blush' | 'Tie' | 'Hop' | 'Cap' | 'Star'

interface Arch {
  w: number
  h: number
  r: string
  beer: string
  n: number
  e: Eyes
  m: Mouth
  a: Accessory
  handle?: boolean
}

const ARCHETYPE_SHAPES: Record<ArchetypeId, Arch> = {
  logo: { w: 54, h: 80, r: '6px 6px 13px 13px', beer: '#F2B53A', n: 3, e: 'Dot', m: 'Smile', a: '' },
  herb: { w: 48, h: 86, r: '5px 5px 9px 9px', beer: '#E9C552', n: 3, e: 'Flat', m: 'Line', a: 'Brow' },
  feierabend: { w: 60, h: 78, r: '4px 4px 18px 18px', beer: '#F0B23B', n: 4, e: 'Happy', m: 'Grin', a: 'Tie' },
  abenteurer: { w: 58, h: 80, r: '14px 14px 30px 30px', beer: '#DB8A2A', n: 4, e: 'Wide', m: 'O', a: 'Hop' },
  geniesser: { w: 62, h: 72, r: '6px 6px 14px 14px', beer: '#F4CB5E', n: 4, e: 'Shades', m: 'Smile', a: 'Blush' },
  philosoph: { w: 62, h: 76, r: '8px 8px 12px 12px', beer: '#B8651E', n: 5, e: 'Specs', m: 'Line', a: 'Must', handle: true },
  probierer: { w: 46, h: 66, r: '12px 12px 24px 24px', beer: '#E7A33A', n: 3, e: 'Curious', m: 'O', a: 'Star' },
  kasten: { w: 60, h: 76, r: '6px 6px 10px 10px', beer: '#EDB847', n: 4, e: 'Wink', m: 'Grin', a: 'Cap' },
}

const INK = '#1D1811'
const FOAM = '#FFF6E3'

const abs = (l: number, t: number, w: number, h: number, extra: CSSProperties = {}): CSSProperties => ({
  position: 'absolute',
  left: l,
  top: t,
  width: w,
  height: h,
  ...extra,
})

export interface BuddyAvatarProps {
  archetype?: ArchetypeId
  size?: number
  /** 0–100 */
  decoded?: number
  className?: string
}

export function BuddyAvatar({ archetype = 'logo', size = 120, decoded = 100, className }: BuddyAvatarProps) {
  const A = ARCHETYPE_SHAPES[archetype] ?? ARCHETYPE_SHAPES.logo
  const hidden = decoded < 30
  const acc = decoded >= 70
  const { w, h } = A
  const l = (120 - w) / 2 - (A.handle ? 7 : 0)
  const t = 108 - h
  const n = A.n
  const d = ((w + 4) / n) * 1.45
  const bumps = Array.from({ length: n }, (_, i) => {
    const x = l - 2 + ((w + 4) * (i + 0.5)) / n - d / 2
    const y = t - d * 0.55
    return { x, y }
  })
  const foamTop = t - d * 0.55
  const cx = l + w / 2
  const ft = t + h * (hidden ? 0.34 : 0.3)
  const eg = Math.max(8, Math.round(w * 0.2))
  const eg2 = Math.max(5, Math.round(w * 0.12))
  const showAcc = (k: Accessory) => !hidden && acc && A.a === k

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, flex: 'none' }}
      role="img"
      aria-label={`Bier-Buddy ${archetype}`}
    >
      <div style={abs(0, 0, 120, 120, { transform: `scale(${size / 120})`, transformOrigin: '0 0' })}>
        {A.handle && (
          <div style={abs(l + w - 6, t + 16, 26, 40, { border: `6px solid ${INK}`, borderRadius: 14 })} />
        )}
        {/* outline */}
        <div style={abs(l - 3, t - 3, w + 6, h + 6, { background: INK, borderRadius: A.r })} />
        {bumps.map((b, i) => (
          <div key={'o' + i} style={abs(b.x - 3, b.y - 3, d + 6, d + 6, { borderRadius: '50%', background: INK })} />
        ))}
        {/* beer */}
        <div style={abs(l, t, w, h, { background: hidden ? '#CFC5B3' : A.beer, borderRadius: A.r, overflow: 'hidden' })}>
          <div style={abs(6, 16, 6, Math.max(10, h - 34), { borderRadius: 3, background: 'rgba(255,255,255,.42)' })} />
          <div style={{ position: 'absolute', right: 9, bottom: 13, width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.6)' }} />
          <div style={{ position: 'absolute', right: 15, bottom: 24, width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.6)' }} />
        </div>
        {/* foam */}
        {bumps.map((b, i) => (
          <div key={'f' + i} style={abs(b.x, b.y, d, d, { borderRadius: '50%', background: FOAM })} />
        ))}
        <div style={abs(l, t, w, 12, { background: FOAM, borderRadius: '6px 6px 0 0' })} />

        {hidden && (
          <div style={abs(l, ft, w, 34, { textAlign: 'center', font: `800 34px/1 var(--font-display)`, color: INK })}>?</div>
        )}

        {/* accessories outside the face */}
        {showAcc('Hop') && (
          <div style={abs(cx - 7.5, foamTop - 11, 15, 15, { transform: 'rotate(45deg)', background: '#6DBE5A', border: `2.5px solid ${INK}`, borderRadius: '2px 9px 2px 9px' })} />
        )}
        {showAcc('Cap') && (
          <>
            <div style={abs(l + w * 0.14, foamTop - 8, w * 0.72, 17, { background: '#E5534B', border: `2.5px solid ${INK}`, borderRadius: '16px 16px 3px 3px' })} />
            <div style={abs(cx, foamTop + 5, w * 0.46, 5, { background: INK, borderRadius: 3 })} />
          </>
        )}
        {showAcc('Star') && (
          <>
            <div style={abs(l + w + 5, t, 10, 10, { transform: 'rotate(45deg)', background: '#FFD166', border: `2px solid ${INK}` })} />
            <div style={abs(l + w + 14, t + 16, 6, 6, { transform: 'rotate(45deg)', background: '#FFD166', border: `2px solid ${INK}` })} />
          </>
        )}

        {!hidden && (
          <div style={{ position: 'absolute', left: l, top: ft, width: w, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            {showAcc('Brow') && (
              <div style={{ display: 'flex', gap: 4, marginBottom: -2 }}>
                <div style={{ width: 14, height: 4.5, background: INK, borderRadius: 3, transform: 'rotate(14deg)' }} />
                <div style={{ width: 14, height: 4.5, background: INK, borderRadius: 3, transform: 'rotate(-14deg)' }} />
              </div>
            )}
            <EyesEl kind={A.e} eg={eg} eg2={eg2} />
            {showAcc('Must') && (
              <div style={{ display: 'flex', marginTop: -1 }}>
                <div style={{ width: 17, height: 9, borderRadius: '50%', background: FOAM, border: `2.5px solid ${INK}` }} />
                <div style={{ width: 17, height: 9, borderRadius: '50%', background: FOAM, border: `2.5px solid ${INK}`, marginLeft: -3 }} />
              </div>
            )}
            <MouthEl kind={A.m} />
            {showAcc('Blush') && (
              <div style={{ display: 'flex', gap: Math.round(w * 0.42), marginTop: -12 }}>
                <div style={{ width: 9, height: 5, borderRadius: '50%', background: 'rgba(229,83,75,.55)' }} />
                <div style={{ width: 9, height: 5, borderRadius: '50%', background: 'rgba(229,83,75,.55)' }} />
              </div>
            )}
            {showAcc('Tie') && (
              <div style={{ width: 9, height: 9, transform: 'rotate(45deg) translate(2px,-1px)', background: '#E5534B', border: `2px solid ${INK}`, marginTop: 1 }} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const dot: CSSProperties = { width: 7, height: 7, borderRadius: '50%', background: INK }
const ring = (s: number): CSSProperties => ({
  width: s,
  height: s,
  borderRadius: '50%',
  background: FOAM,
  border: `2.5px solid ${INK}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})
const pupil = (s: number): CSSProperties => ({ width: s, height: s, borderRadius: '50%', background: INK })

function EyesEl({ kind, eg, eg2 }: { kind: Eyes; eg: number; eg2: number }) {
  const row = (gap: number, children: React.ReactNode) => (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>{children}</div>
  )
  switch (kind) {
    case 'Dot':
      return row(eg, <><div style={dot} /><div style={dot} /></>)
    case 'Flat':
      return row(eg, <><div style={{ width: 10, height: 4, borderRadius: 2, background: INK }} /><div style={{ width: 10, height: 4, borderRadius: 2, background: INK }} /></>)
    case 'Happy': {
      const arc: CSSProperties = { width: 12, height: 7, border: `3px solid ${INK}`, borderBottom: 0, borderRadius: '10px 10px 0 0' }
      return row(eg, <><div style={arc} /><div style={arc} /></>)
    }
    case 'Wide':
      return row(eg2, <><div style={ring(14)}><div style={pupil(5)} /></div><div style={ring(14)}><div style={pupil(5)} /></div></>)
    case 'Shades': {
      const lens: CSSProperties = { width: 19, height: 11, borderRadius: '3px 3px 9px 9px', background: INK }
      return row(3, <><div style={lens} /><div style={{ width: 4, height: 3, background: INK }} /><div style={lens} /></>)
    }
    case 'Wink':
      return row(eg, <><div style={dot} /><div style={{ width: 11, height: 4, borderRadius: 2, background: INK }} /></>)
    case 'Curious':
      return row(eg2, <><div style={dot} /><div style={ring(15)}><div style={pupil(6)} /></div></>)
    case 'Specs': {
      const lens: CSSProperties = { width: 16, height: 16, borderRadius: '50%', border: `2.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }
      return row(2, <><div style={lens}><div style={pupil(4)} /></div><div style={{ width: 4, height: 2.5, background: INK }} /><div style={lens}><div style={pupil(4)} /></div></>)
    }
  }
}

function MouthEl({ kind }: { kind: Mouth }) {
  switch (kind) {
    case 'Smile':
      return <div style={{ width: 16, height: 8, border: `3px solid ${INK}`, borderTop: 0, borderRadius: '0 0 10px 10px' }} />
    case 'Line':
      return <div style={{ width: 12, height: 3, borderRadius: 2, background: INK }} />
    case 'O':
      return <div style={{ width: 8, height: 10, borderRadius: '50%', background: INK }} />
    case 'Grin':
      return <div style={{ width: 18, height: 9, borderRadius: '0 0 10px 10px', background: INK }} />
  }
}
