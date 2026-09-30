import { useMemo } from 'react'
import { countRatings, decodedPercent } from '../domain/dna'
import type { ArchetypeId, RatingCounts } from '../domain/types'
import { useApp } from './AppContext'

export interface Derived {
  counts: RatingCounts
  decoded: number
  archetype: ArchetypeId
}

/** Everything computed from the ratings, memoised per ratings object. */
export function useDerived(): Derived {
  const { ratings } = useApp().state.profile
  return useMemo(() => {
    const counts = countRatings(ratings)
    return { counts, decoded: decodedPercent(counts.total), archetype: 'logo' as ArchetypeId }
  }, [ratings])
}
