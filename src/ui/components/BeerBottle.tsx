import { useId, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { formatAbv } from '../../data/beers'
import { bottleDesign } from '../../domain/bottles/design'
import { renderBottle } from '../../domain/bottles/render'
import { hashId } from '../../domain/hash'
import type { Beer } from '../../domain/types'

interface Props {
  beer: Beer
  /** Rendered height in px; width is half of it. Omit to size via className. */
  size?: number
  className?: string
  style?: CSSProperties
}

/** Thumbnails stay still – a list of 60 wiggling bottles is noise, not charm. */
const STILL_BELOW = 60

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * The bottle of a beer, generated from its design (hand-tuned `beer.bottle` or derived from style,
 * colour and taste – see domain/bottles). Inlined as SVG so it uses the app's fonts; a real photo in
 * `beer.image` wins if it loads.
 */
export function BeerBottle({ beer, size, className, style }: Props) {
  const uid = useId()
  const [broken, setBroken] = useState<string | null>(null)
  const still = (size !== undefined && size < STILL_BELOW) || reducedMotion()
  const svg = useMemo(
    () => renderBottle({ design: bottleDesign(beer), beer: beer.color, abv: formatAbv(beer.abv), seed: hashId(beer.id), uid: `b${uid}`, still }),
    [beer, uid, still],
  )
  const box: CSSProperties = { display: 'inline-block', lineHeight: 0, aspectRatio: '1 / 2', ...(size !== undefined ? { width: size / 2, height: size } : {}), ...style }

  if (beer.image && broken !== beer.image)
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
  return <span role="img" aria-label={beer.fullName} className={className} style={box} dangerouslySetInnerHTML={{ __html: svg }} />
}
