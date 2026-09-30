import { useMemo } from 'react'
import { evaluateAchievements } from '../domain/achievements'
import type { Achievement } from '../domain/achievements'
import { buildAvatar } from '../domain/avatar'
import type { AvatarSpec } from '../domain/avatar'
import { computeDNA } from '../domain/dna'
import { rankCandidates } from '../domain/matching'
import type { Candidate } from '../domain/matching'
import { archetypeFor } from '../domain/persona'
import type { ArchetypeId, BeerDNA, RatingCounts } from '../domain/types'
import { useApp } from './AppContext'

export interface Derived {
  dna: BeerDNA
  counts: RatingCounts
  decoded: number
  archetype: ArchetypeId
  avatar: AvatarSpec
  /** Recommended beers, best first. */
  candidates: Candidate[]
  achievements: Achievement[]
}

/** Everything computed from the ratings, memoised per ratings object. */
export function useDerived(): Derived {
  const { ratings } = useApp().state.profile
  return useMemo(() => {
    const dna = computeDNA(ratings)
    const archetype = archetypeFor(dna)
    return {
      dna,
      counts: dna.counts,
      decoded: dna.decoded,
      archetype,
      avatar: buildAvatar(archetype, dna.decoded),
      candidates: rankCandidates(dna.taste, ratings),
      achievements: evaluateAchievements(dna.counts, dna.decoded),
    }
  }, [ratings])
}
