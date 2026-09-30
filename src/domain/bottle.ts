import { hashId } from './quips'
import type { Beer } from './types'

/**
 * Illustrated fallback bottle for beers without a designed PNG. Everything follows from the beer's
 * style, tags and id, so the same beer always looks the same. Brand-neutral on purpose: colours come
 * from a fixed PilsBuddy palette, never from real labels.
 */

export type BottleShape = 'longneck' | 'euro' | 'steinie' | 'weizen' | 'swingtop' | 'belgian' | 'stubby' | 'can'
export type Closure = 'crown' | 'swing' | 'can'
export type BottleDetail = 'none' | 'lime'

export interface BottleSpec {
  shape: BottleShape
  closure: Closure
  /** Glass colour; for cans the body colour. */
  glass: string
  label: string
  labelInk: string
  /** Cap, neck band and label stripe. */
  accent: string
  detail: BottleDetail
  name: string
  style: string
  /** The background the bottle is drawn on (card, detail hero) – decides the outline colour. */
  beerColor: string
}

const SHAPE_BY_STYLE: Record<string, BottleShape> = {
  Pils: 'longneck',
  Lager: 'longneck',
  Kölsch: 'longneck',
  Schwarzbier: 'longneck',
  Helles: 'euro',
  Altbier: 'euro',
  Rauchbier: 'euro',
  Bock: 'euro',
  Export: 'euro',
  Doppelbock: 'steinie',
  Weißbier: 'weizen',
  Kellerbier: 'swingtop',
  Stout: 'stubby',
  'Pale Ale': 'can',
  IPA: 'can',
  'Belgian Strong Ale': 'belgian',
  'Abbey Blonde': 'belgian',
}

export const GLASS = {
  brown: '#5A3217',
  green: '#2F6B3A',
  clear: '#D8E3CF',
  black: '#1A120C',
} as const

/** Label palette: [label, ink, accent]. */
export const LABELS: [string, string, string][] = [
  ['#FFF6E3', '#1D1811', '#C8322B'],
  ['#C8322B', '#FFF6E3', '#F2B53A'],
  ['#2B4C8C', '#FFF6E3', '#F2B53A'],
  ['#2F6B3A', '#FFF6E3', '#F2B53A'],
  ['#F2B53A', '#1D1811', '#C8322B'],
  ['#1D1811', '#F2B53A', '#FFF6E3'],
]

export function shapeFor(beer: Beer): BottleShape {
  return SHAPE_BY_STYLE[beer.style] ?? 'longneck'
}

function glassFor(beer: Beer): string {
  if (beer.tags.includes('Limette')) return GLASS.clear
  if (beer.tags.includes('grüne Flasche') || beer.style === 'Lager') return GLASS.green
  if (beer.style === 'Stout' || beer.style === 'Schwarzbier') return GLASS.black
  return GLASS.brown
}

export function buildBottle(beer: Beer): BottleSpec {
  const shape = shapeFor(beer)
  let i = hashId(beer.id) % LABELS.length
  let glass = glassFor(beer)
  // a label must never disappear into its own glass
  if (shape !== 'can' && LABELS[i][0] === glass) i = (i + 1) % LABELS.length
  const [label, labelInk, accent] = LABELS[i]
  if (shape === 'can') glass = label
  const closure: Closure =
    shape === 'can' ? 'can' : shape === 'swingtop' || beer.tags.includes('Bügelverschluss') ? 'swing' : 'crown'
  return {
    shape,
    closure,
    glass,
    label,
    labelInk,
    accent,
    detail: beer.tags.includes('Limette') ? 'lime' : 'none',
    name: beer.name,
    style: beer.style,
    beerColor: beer.color,
  }
}
