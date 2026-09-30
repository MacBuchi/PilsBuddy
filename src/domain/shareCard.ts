import { BEER_BY_ID } from '../data/beers'
import { COPY } from '../data/copy'
import type { AvatarSpec } from './avatar'
import { DISPLAY_AXES } from './dna'
import { compatibility } from './matching'
import type { ArchetypeId, Beer, BeerDNA, Ratings } from './types'

/** Everything the share image shows – computed here, drawn in ui/share. */
export interface ShareCardData {
  persona: string
  traits: readonly string[]
  decoded: number
  bars: { label: string; value: number; color: string }[]
  /** "Herzbiere": best-fitting liked beers; falls back to recommendations if nothing is liked yet. */
  top: { name: string; pct: number }[]
  topLabel: string
  avatar: AvatarSpec
}

export function shareCardData(
  dna: BeerDNA,
  archetype: ArchetypeId,
  avatar: AvatarSpec,
  ratings: Ratings,
  recommendations: readonly { beer: Beer; pct: number }[],
  lookup: Readonly<Record<string, Beer>> = BEER_BY_ID,
): ShareCardData {
  const persona = COPY.personas[archetype]
  const liked = Object.entries(ratings)
    .filter(([id, e]) => e.rating === 'LIKE' && lookup[id])
    .map(([id]) => ({ name: lookup[id].name, pct: compatibility(dna.taste, lookup[id].taste) }))
    .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, 'de'))
  const top = (liked.length ? liked : recommendations.map((r) => ({ name: r.beer.name, pct: r.pct }))).slice(0, 3)
  return {
    persona: persona.name,
    traits: persona.traits,
    decoded: dna.decoded,
    bars: DISPLAY_AXES.map((a) => ({ label: a.label, value: Math.round(dna.taste[a.axis]), color: a.color })),
    top,
    topLabel: liked.length ? COPY.share.topLiked : COPY.share.topNext,
    avatar,
  }
}
