import { useMemo, useState } from 'react'
import { evaluateAchievements, progressOf } from '../domain/achievements'
import type { Achievement } from '../domain/achievements'
import { avatarExtras, buildAvatar } from '../domain/avatar'
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
  const { profile, beersRev } = useApp().state
  const { ratings, games } = profile
  // Session start, taken once; newer ratings push "now" forward so fresh swipes count as activity.
  const [sessionStart] = useState(() => Date.now())
  return useMemo(() => {
    const dna = computeDNA(ratings)
    const archetype = archetypeFor(dna)
    const achievements = evaluateAchievements(progressOf(ratings, games))
    const unlocked = achievements.filter((a) => a.unlocked).map((a) => a.id)
    const now = Math.max(sessionStart, ...Object.values(ratings).map((e) => e.at))
    const extras = avatarExtras(ratings, dna.taste, unlocked, now)
    return {
      dna,
      counts: dna.counts,
      decoded: dna.decoded,
      archetype,
      avatar: buildAvatar(archetype, dna.decoded, extras),
      candidates: rankCandidates(dna.taste, ratings),
      achievements,
    }
    // beersRev: regional beers restored after start (R11) change what the ratings mean
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, ratings, sessionStart, beersRev])
}
