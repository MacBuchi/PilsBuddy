import { useId } from 'react'
import type { CSSProperties } from 'react'
import { GLASS, buildBottle } from '../../domain/bottle'
import type { BottleShape, BottleSpec } from '../../domain/bottle'
import type { Beer } from '../../domain/types'
import { isDarkBeer } from '../color'

/** Geometry on a 100×200 canvas (same 1:2 format as the designed PNGs), bottom line at y=194. */
interface Geo {
  bw: number
  bodyTop: number
  neckW: number
  neckBottom: number
  neckTop: number
  r: number
  label: [number, number]
  band?: [number, number]
}

const BOTTOM = 194
const CX = 50

const GEO: Record<Exclude<BottleShape, 'can'>, Geo> = {
  longneck: { bw: 40, bodyTop: 104, neckW: 14, neckBottom: 62, neckTop: 18, r: 6, label: [124, 172], band: [30, 44] },
  euro: { bw: 48, bodyTop: 102, neckW: 17, neckBottom: 72, neckTop: 36, r: 7, label: [118, 170] },
  steinie: { bw: 54, bodyTop: 114, neckW: 19, neckBottom: 88, neckTop: 58, r: 8, label: [126, 176] },
  weizen: { bw: 46, bodyTop: 150, neckW: 15, neckBottom: 60, neckTop: 20, r: 9, label: [132, 180], band: [32, 46] },
  swingtop: { bw: 48, bodyTop: 102, neckW: 18, neckBottom: 72, neckTop: 36, r: 7, label: [118, 170] },
  belgian: { bw: 54, bodyTop: 128, neckW: 17, neckBottom: 78, neckTop: 42, r: 13, label: [126, 176], band: [50, 60] },
  stubby: { bw: 56, bodyTop: 110, neckW: 24, neckBottom: 84, neckTop: 64, r: 9, label: [114, 176] },
}

function bottlePath(g: Geo): string {
  const L = CX - g.bw / 2
  const R = CX + g.bw / 2
  const nl = CX - g.neckW / 2
  const nr = CX + g.neckW / 2
  const span = g.bodyTop - g.neckBottom
  const c1 = g.bodyTop - span * 0.55
  const c2 = g.neckBottom + span * 0.35
  return [
    `M ${L} ${BOTTOM - g.r}`,
    `Q ${L} ${BOTTOM} ${L + g.r} ${BOTTOM}`,
    `L ${R - g.r} ${BOTTOM}`,
    `Q ${R} ${BOTTOM} ${R} ${BOTTOM - g.r}`,
    `L ${R} ${g.bodyTop}`,
    `C ${R} ${c1} ${nr} ${c2} ${nr} ${g.neckBottom}`,
    `L ${nr} ${g.neckTop}`,
    `L ${nl} ${g.neckTop}`,
    `L ${nl} ${g.neckBottom}`,
    `C ${nl} ${c2} ${L} ${c1} ${L} ${g.bodyTop}`,
    'Z',
  ].join(' ')
}

const CAN = { x: 24, w: 52, top: 62, r: 7 }
const canPath = `M ${CAN.x} ${CAN.top + CAN.r} Q ${CAN.x} ${CAN.top} ${CAN.x + CAN.r} ${CAN.top} L ${CAN.x + CAN.w - CAN.r} ${CAN.top} Q ${CAN.x + CAN.w} ${CAN.top} ${CAN.x + CAN.w} ${CAN.top + CAN.r} L ${CAN.x + CAN.w} ${BOTTOM - CAN.r} Q ${CAN.x + CAN.w} ${BOTTOM} ${CAN.x + CAN.w - CAN.r} ${BOTTOM} L ${CAN.x + CAN.r} ${BOTTOM} Q ${CAN.x} ${BOTTOM} ${CAN.x} ${BOTTOM - CAN.r} Z`

const FOAM = '#FFF6E3'
const INK = '#1D1811'

interface Props {
  beer: Beer
  /** Rendered height in px; width is half of it. Omit to size via className. */
  size?: number
  className?: string
  style?: CSSProperties
  /** Override the outline (e.g. theme ink for bottles on the page background). */
  outline?: string
}

/**
 * Stylised bottle in the Bierdeckel look: ink edge, hard offset shadow, flat fills, no gradients.
 * Used wherever a beer has no designed `image`.
 */
export function BottleArt({ beer, size, className, style, outline }: Props) {
  const spec = buildBottle(beer)
  const clip = useId()
  const mini = size !== undefined && size < 70
  const line = outline ?? (isDarkBeer(spec.beerColor) ? FOAM : INK)
  const sw = mini ? 5 : 2.6
  return (
    <svg
      viewBox="0 0 100 200"
      width={size !== undefined ? size / 2 : undefined}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label={beer.fullName}
    >
      {spec.shape === 'can' ? (
        <Can spec={spec} clip={clip} line={line} sw={sw} mini={mini} />
      ) : (
        <Bottle spec={spec} geo={GEO[spec.shape]} clip={clip} line={line} sw={sw} mini={mini} />
      )}
    </svg>
  )
}

interface PartProps {
  spec: BottleSpec
  clip: string
  line: string
  sw: number
  mini: boolean
}

/** Two lines for long multi-word names, then squeeze instead of shrinking below legibility. */
function LabelText({ spec, width, cy, max }: { spec: BottleSpec; width: number; cy: number; max: number }) {
  const room = width - 8
  const words = spec.name.split(' ')
  let lines = [spec.name]
  if (words.length > 1 && spec.name.length > 11) {
    let best = 1
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length
      const b = words.slice(i).join(' ').length
      const cur = Math.max(words.slice(0, best).join(' ').length, words.slice(best).join(' ').length)
      if (Math.max(a, b) < cur) best = i
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
  }
  const longest = Math.max(...lines.map((l) => l.length))
  const fs = Math.max(7.5, Math.min(max, room / (longest * 0.56)))
  const lh = fs * 0.95
  const top = cy - ((lines.length - 1) * lh) / 2 + fs * 0.2 - 3
  const styleW = spec.style.length * 3.7
  return (
    <g fill={spec.labelInk}>
      {lines.map((l, i) => {
        const squeeze = l.length * 0.56 * fs > room
        return (
          <text
            key={i}
            x={CX}
            y={top + i * lh}
            textAnchor="middle"
            textLength={squeeze ? room : undefined}
            lengthAdjust="spacingAndGlyphs"
            style={{ font: `800 ${fs}px var(--font-display)`, letterSpacing: '-0.03em' }}
          >
            {l}
          </text>
        )
      })}
      <text
        x={CX}
        y={top + (lines.length - 1) * lh + 9}
        textAnchor="middle"
        opacity={0.8}
        textLength={styleW > room ? room : undefined}
        lengthAdjust="spacingAndGlyphs"
        style={{ font: '700 5px var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        {spec.style}
      </text>
    </g>
  )
}

function Bottle({ spec, geo, clip, line, sw, mini }: PartProps & { geo: Geo }) {
  const d = bottlePath(geo)
  const [lt, lb] = geo.label
  const clear = spec.glass === GLASS.clear
  return (
    <>
      <path d={d} fill={INK} opacity={0.25} transform="translate(4 3)" />
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={spec.glass} />
      <g clipPath={`url(#${clip})`}>
        {clear && <rect x={0} y={geo.neckBottom + 8} width={100} height={200} fill={spec.beerColor} />}
        <rect x={CX - geo.bw / 2 + 6} y={geo.bodyTop - 4} width={5} height={BOTTOM - geo.bodyTop - 10} fill={FOAM} opacity={0.3} />
        <rect x={CX - geo.neckW / 2 + 3} y={geo.neckTop + 6} width={3} height={geo.neckBottom - geo.neckTop} fill={FOAM} opacity={0.3} />
        {geo.band && (
          <rect x={0} y={geo.band[0]} width={100} height={geo.band[1] - geo.band[0]} fill={spec.accent} stroke={line} strokeWidth={sw * 0.6} />
        )}
        <rect x={0} y={lt} width={100} height={lb - lt} fill={spec.label} stroke={line} strokeWidth={sw * 0.7} />
        <rect x={0} y={lt + 4} width={100} height={3} fill={spec.accent} />
        <rect x={0} y={lb - 7} width={100} height={3} fill={spec.accent} />
      </g>
      <path d={d} fill="none" stroke={line} strokeWidth={sw} strokeLinejoin="round" />
      {!mini && <LabelText spec={spec} width={geo.bw} cy={(lt + lb) / 2} max={13} />}
      <Closure spec={spec} geo={geo} line={line} sw={sw} />
    </>
  )
}

function Closure({ spec, geo, line, sw }: { spec: BottleSpec; geo: Geo; line: string; sw: number }) {
  const w = geo.neckW + 3
  const x = CX - w / 2
  const t = geo.neckTop
  if (spec.detail === 'lime') {
    return (
      <g>
        <circle cx={CX + 3} cy={t - 1} r={8} fill="#7DB544" stroke={line} strokeWidth={sw * 0.8} />
        <circle cx={CX + 3} cy={t - 1} r={4.5} fill="#C9E08A" />
        <rect x={x} y={t - 1} width={w} height={5} rx={1.5} fill={spec.glass} stroke={line} strokeWidth={sw * 0.8} />
      </g>
    )
  }
  if (spec.closure === 'swing') {
    return (
      <g>
        <path d={`M ${x - 1} ${t - 4} L ${x + 1} ${t + 16} M ${x + w + 1} ${t - 4} L ${x + w - 1} ${t + 16}`} stroke={line} strokeWidth={sw * 0.7} />
        <rect x={x} y={t + 12} width={w} height={4} rx={1} fill={spec.glass} stroke={line} strokeWidth={sw * 0.6} />
        <rect x={x + 1} y={t - 11} width={w - 2} height={11} rx={5} fill={FOAM} stroke={line} strokeWidth={sw * 0.8} />
        <rect x={x + 3} y={t - 4} width={w - 6} height={3} fill={spec.accent} />
      </g>
    )
  }
  return (
    <g>
      <rect x={x} y={t - 1} width={w} height={6} rx={1.5} fill={spec.glass} stroke={line} strokeWidth={sw * 0.8} />
      <rect x={x - 1} y={t - 8} width={w + 2} height={8} rx={2} fill={spec.accent} stroke={line} strokeWidth={sw * 0.8} />
    </g>
  )
}

function Can({ spec, clip, line, sw, mini }: PartProps) {
  const mid = 132
  return (
    <>
      <path d={canPath} fill={INK} opacity={0.25} transform="translate(4 3)" />
      <clipPath id={clip}>
        <path d={canPath} />
      </clipPath>
      <path d={canPath} fill={spec.label} />
      <g clipPath={`url(#${clip})`}>
        <rect x={0} y={96} width={100} height={8} fill={spec.accent} />
        <rect x={0} y={162} width={100} height={8} fill={spec.accent} />
        <rect x={CAN.x + 6} y={CAN.top + 12} width={5} height={BOTTOM - CAN.top - 26} fill={FOAM} opacity={0.3} />
      </g>
      <path d={canPath} fill="none" stroke={line} strokeWidth={sw} strokeLinejoin="round" />
      <rect x={CAN.x + 4} y={CAN.top - 6} width={CAN.w - 8} height={7} rx={2} fill="#C9C2B4" stroke={line} strokeWidth={sw * 0.8} />
      {!mini && <LabelText spec={spec} width={CAN.w} cy={mid} max={14} />}
    </>
  )
}
