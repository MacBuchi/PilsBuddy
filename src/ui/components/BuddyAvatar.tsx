import type { CSSProperties, ReactNode } from 'react'
import { buildAvatar } from '../../domain/avatar'
import type { AvatarSpec, Eyes, Mouth } from '../../domain/avatar'
import type { ArchetypeId } from '../../domain/types'

/**
 * Renders an AvatarSpec (domain/avatar.ts) as the parametric "Glas-Charakter":
 * glass outline, beer fill, foam bumps, face and accessory on a 120×120 canvas.
 * Ink/foam colours are fixed on purpose – the avatar always sits on gold or cream.
 */

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
  /** Full spec from the DNA – or a plain archetype for static uses (logo, previews). */
  spec?: AvatarSpec
  archetype?: ArchetypeId
  /** 0–100, only used together with `archetype`. */
  decoded?: number
  size?: number
  className?: string
}

export function BuddyAvatar({ spec, archetype = 'logo', decoded = 100, size = 120, className }: BuddyAvatarProps) {
  const A = spec ?? buildAvatar(archetype, decoded)
  const hidden = A.stage === 'hidden'
  const { width: w, height: h } = A
  const l = (120 - w) / 2 - (A.handle ? 7 : 0)
  const t = 108 - h
  const n = A.foamBumps
  const d = ((w + 4) / n) * 1.45
  const bumps = Array.from({ length: n }, (_, i) => ({
    x: l - 2 + ((w + 4) * (i + 0.5)) / n - d / 2,
    y: t - d * 0.55,
  }))
  const foamTop = t - d * 0.55
  const cx = l + w / 2
  const ft = t + h * (hidden ? 0.34 : 0.3)
  const eg = Math.max(8, Math.round(w * 0.2))
  const eg2 = Math.max(5, Math.round(w * 0.12))
  const acc = A.accessory

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, flex: 'none' }}
      role="img"
      aria-label={`Bier-Buddy ${A.archetype}`}
    >
      <div style={abs(0, 0, 120, 120, { transform: `scale(${size / 120})`, transformOrigin: '0 0' })}>
        {A.handle && <div style={abs(l + w - 6, t + 16, 26, 40, { border: `6px solid ${INK}`, borderRadius: 14 })} />}
        {/* outline */}
        <div style={abs(l - 3, t - 3, w + 6, h + 6, { background: INK, borderRadius: A.radius })} />
        {bumps.map((b, i) => (
          <div key={'o' + i} style={abs(b.x - 3, b.y - 3, d + 6, d + 6, { borderRadius: '50%', background: INK })} />
        ))}
        {/* beer */}
        <div style={abs(l, t, w, h, { background: A.beerColor, borderRadius: A.radius, overflow: 'hidden' })}>
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
          <div style={abs(l, ft, w, 34, { textAlign: 'center', font: '800 34px/1 var(--font-display)', color: INK })}>?</div>
        )}

        {/* accessories outside the face */}
        {acc === 'Hop' && (
          <div style={abs(cx - 7.5, foamTop - 11, 15, 15, { transform: 'rotate(45deg)', background: '#6DBE5A', border: `2.5px solid ${INK}`, borderRadius: '2px 9px 2px 9px' })} />
        )}
        {acc === 'Cap' && (
          <>
            <div style={abs(l + w * 0.14, foamTop - 8, w * 0.72, 17, { background: '#E5534B', border: `2.5px solid ${INK}`, borderRadius: '16px 16px 3px 3px' })} />
            <div style={abs(cx, foamTop + 5, w * 0.46, 5, { background: INK, borderRadius: 3 })} />
          </>
        )}
        {acc === 'Star' && (
          <>
            <div style={abs(l + w + 5, t, 10, 10, { transform: 'rotate(45deg)', background: '#FFD166', border: `2px solid ${INK}` })} />
            <div style={abs(l + w + 14, t + 16, 6, 6, { transform: 'rotate(45deg)', background: '#FFD166', border: `2px solid ${INK}` })} />
          </>
        )}

        {!hidden && (
          <div style={{ position: 'absolute', left: l, top: ft, width: w, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            {acc === 'Brow' && (
              <div style={{ display: 'flex', gap: 4, marginBottom: -2 }}>
                <div style={{ width: 14, height: 4.5, background: INK, borderRadius: 3, transform: 'rotate(14deg)' }} />
                <div style={{ width: 14, height: 4.5, background: INK, borderRadius: 3, transform: 'rotate(-14deg)' }} />
              </div>
            )}
            <EyesEl kind={A.eyes} eg={eg} eg2={eg2} />
            {acc === 'Must' && (
              <div style={{ display: 'flex', marginTop: -1 }}>
                <div style={{ width: 17, height: 9, borderRadius: '50%', background: FOAM, border: `2.5px solid ${INK}` }} />
                <div style={{ width: 17, height: 9, borderRadius: '50%', background: FOAM, border: `2.5px solid ${INK}`, marginLeft: -3 }} />
              </div>
            )}
            <MouthEl kind={A.mouth} />
            {acc === 'Blush' && (
              <div style={{ display: 'flex', gap: Math.round(w * 0.42), marginTop: -12 }}>
                <div style={{ width: 9, height: 5, borderRadius: '50%', background: 'rgba(229,83,75,.55)' }} />
                <div style={{ width: 9, height: 5, borderRadius: '50%', background: 'rgba(229,83,75,.55)' }} />
              </div>
            )}
            {acc === 'Tie' && (
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
const row = (gap: number, children: ReactNode) => <div style={{ display: 'flex', gap, alignItems: 'center' }}>{children}</div>

function EyesEl({ kind, eg, eg2 }: { kind: Eyes; eg: number; eg2: number }) {
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
