import { useId } from 'react'
import { brimOf, heightFor, radiusAt } from '../../domain/games/fill'
import type { Glass, GlassId } from '../../domain/games/fill'

/** All glasses share one scale (1 unit = 1 mm), so a Maß really looks bigger than a Stange. */
const W = 160
const H = 272
const CX = 74
const WALL = 3
/** Thick glass bottom of the glasses without a stem. */
const BASE = 10
const FOAM = 7

/** The beer that usually goes into each glass. */
const BEER: Record<GlassId, string> = {
  stange: '#f2cb55',
  tulpe: '#f4c03f',
  willi: '#eaa936',
  weizen: '#e99a33',
  mass: '#f2b53a',
}

interface Props {
  glass: Glass
  /** Beer in the glass, in ml. */
  ml: number
  /** The player's guess – drawn as a dashed line at the height it would reach. */
  guess?: number | null
  /** Label next to the Eichstrich (e.g. „0,5 l“). */
  markLabel: string
  height: number
  /** Restart the pour animation when this changes. */
  pourKey?: string | number
}

const pts = (list: readonly (readonly [number, number])[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** A glass drawn from its inner profile (domain/games/fill.ts), filled to `ml`. */
export function FillGlass({ glass, ml, guess = null, markLabel, height, pourKey }: Props) {
  const clip = useId()
  const top = brimOf(glass)
  const foot = glass.stem > 0 ? glass.stem : BASE
  const bottom = H - 2 - foot
  const y = (h: number) => bottom - h
  const { profile } = glass

  const inner = [
    ...[...profile].reverse().map(([h, r]) => [CX - r, y(h)] as const),
    ...profile.map(([h, r]) => [CX + r, y(h)] as const),
  ]
  const r0 = profile[0][1] + WALL
  const under = glass.stem > 0 ? WALL + 1 : BASE
  const outer = [
    ...[...profile].reverse().map(([h, r]) => [CX - r - WALL, y(h)] as const),
    [CX - r0, y(0) + under] as const,
    [CX + r0, y(0) + under] as const,
    ...profile.map(([h, r]) => [CX + r + WALL, y(h)] as const),
  ]

  const level = heightFor(glass, ml)
  const rMark = radiusAt(glass, glass.mark)
  const guessH = guess === null ? null : heightFor(glass, guess)
  const rTop = radiusAt(glass, top)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={height} width={(height * W) / H} role="img" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <polygon points={pts(inner)} />
        </clipPath>
      </defs>

      {glass.handle && (
        <g fill="none" strokeLinecap="butt" strokeLinejoin="round">
          <path d={handlePath(glass, y)} stroke="var(--ink)" strokeWidth={13} />
          <path d={handlePath(glass, y)} stroke="var(--sf)" strokeWidth={7.5} />
        </g>
      )}
      {glass.stem > 0 && (
        <g stroke="var(--ink)" strokeWidth={2.5} vectorEffect="non-scaling-stroke">
          <rect x={CX - 4} y={y(0) + under - 1} width={8} height={glass.stem - under - 3} fill="var(--sf)" vectorEffect="non-scaling-stroke" />
          <ellipse cx={CX} cy={H - 6} rx={30} ry={4} fill="var(--sf)" vectorEffect="non-scaling-stroke" />
        </g>
      )}

      <polygon points={pts(outer)} fill="var(--sf)" fillOpacity={0.5} />

      <g clipPath={`url(#${clip})`}>
        <g key={pourKey} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%', animation: 'pbPour 0.9s cubic-bezier(.3,.7,.3,1) both' }}>
          <rect x={0} y={y(level)} width={W} height={level + 1} fill={BEER[glass.id]} />
          {level > 0 && <rect x={0} y={y(level) - FOAM} width={W} height={FOAM} fill="var(--foam)" />}
        </g>
        {/* shine */}
        <rect x={CX - rTop * 0.72} y={y(top)} width={5} height={top} fill="#fff" opacity={0.25} />
      </g>
      <polyline points={pts(inner)} fill="none" stroke="var(--line-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {/* outline open at the top, with the rim closing each wall */}
      <polyline
        points={pts([inner[0], ...outer, inner[inner.length - 1]])}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Eichstrich */}
      <line x1={CX + rMark - 16} x2={CX + rMark} y1={y(glass.mark)} y2={y(glass.mark)} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <text x={CX + rMark - 3} y={y(glass.mark) - 3} textAnchor="end" fontSize={8.5} fontWeight={700} fill="var(--ink)" fontFamily="var(--font-mono)">
        {markLabel}
      </text>

      {guessH !== null && (
        <line
          x1={CX - radiusAt(glass, guessH)}
          x2={CX + radiusAt(glass, guessH)}
          y1={y(guessH)}
          y2={y(guessH)}
          stroke="var(--try)"
          strokeWidth={3}
          strokeDasharray="5 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

function handlePath(g: Glass, y: (h: number) => number): string {
  const top = brimOf(g)
  const hi = top * 0.82
  const lo = top * 0.22
  const xa = CX + radiusAt(g, hi) + WALL
  const xb = CX + radiusAt(g, lo) + WALL
  const out = Math.max(xa, xb) + 28
  return `M${xa},${y(hi)} C${out},${y(hi)} ${out},${y(hi)} ${out},${y(hi) + 26} L${out},${y(lo) - 26} C${out},${y(lo)} ${out},${y(lo)} ${xb},${y(lo)}`
}
