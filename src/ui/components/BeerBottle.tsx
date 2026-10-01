import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Beer } from '../../domain/types'
import { BottleArt } from './BottleArt'

interface Props {
  beer: Beer
  /** Rendered height in px; width is half of it. Omit to size via className. */
  size?: number
  className?: string
  style?: CSSProperties
  /** Outline for the drawn fallback (designed bottles bring their own). */
  outline?: string
}

/**
 * The bottle of a beer: the designed SVG from `public/bottles/` (face + animations, same 1:2 canvas)
 * when `beer.image` is set, otherwise (or if the file can't be loaded) the parametric `BottleArt`.
 */
export function BeerBottle({ beer, size, className, style, outline }: Props) {
  const [broken, setBroken] = useState<string | null>(null)
  if (!beer.image || broken === beer.image) return <BottleArt beer={beer} size={size} className={className} style={style} outline={outline} />
  return (
    <img
      src={beer.image}
      alt={beer.fullName}
      width={size !== undefined ? size / 2 : undefined}
      height={size}
      className={className}
      style={style}
      draggable={false}
      decoding="async"
      onError={() => setBroken(beer.image ?? null)}
    />
  )
}
