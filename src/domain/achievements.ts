import { DECK_ORDER } from '../data/beers'
import type { RatingCounts } from './types'

export interface AchievementDef {
  id: string
  title: string
  desc: string
  /** Phosphor icon name, resolved in the UI. */
  icon: 'heart' | 'crown' | 'binoculars' | 'beer-stein' | 'hand-waving' | 'dna' | 'fire' | 'medal' | 'package'
  test: (c: RatingCounts, decoded: number) => boolean
}

export interface Achievement extends AchievementDef {
  unlocked: boolean
}

/** Light gamification only – nine badges, none of them nagging. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-date', title: 'Erstes Date', desc: '1 Bier gedatet', icon: 'heart', test: (c) => c.total >= 1 },
  { id: 'pils-neuling', title: 'Pils-Neuling', desc: '10 Biere gedatet', icon: 'beer-stein', test: (c) => c.total >= 10 },
  { id: 'hohe-ansprueche', title: 'Hohe Ansprüche', desc: '5 Körbe verteilt', icon: 'crown', test: (c) => c.DISLIKE >= 5 },
  { id: 'neugiernase', title: 'Neugiernase', desc: '3× Probieren', icon: 'binoculars', test: (c) => c.WANT_TO_TRY >= 3 },
  { id: 'ehrlich', title: 'Ehrlich', desc: '3× „Kenn ich nicht“', icon: 'hand-waving', test: (c) => c.UNKNOWN >= 3 },
  { id: 'entschluesselt', title: 'Entschlüsselt', desc: 'DNA zu 100 %', icon: 'dna', test: (_c, dec) => dec >= 100 },
  { id: 'hopfen-herz', title: 'Hopfen-Herz', desc: '15 Herzen vergeben', icon: 'fire', test: (c) => c.LIKE >= 15 },
  { id: 'pils-fluesterer', title: 'Pils-Flüsterer', desc: '25 Biere gedatet', icon: 'medal', test: (c) => c.total >= 25 },
  {
    id: 'kasten-kenner',
    title: 'Kasten-Kenner',
    desc: `Alle ${DECK_ORDER.length} Biere gedatet`,
    icon: 'package',
    test: (c) => c.total >= DECK_ORDER.length,
  },
]

export function evaluateAchievements(c: RatingCounts, decoded: number): Achievement[] {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.test(c, decoded) }))
}

/** Ids newly unlocked between two states – for a toast when one pops. */
export function newlyUnlocked(before: RatingCounts, after: RatingCounts, decBefore: number, decAfter: number): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !a.test(before, decBefore) && a.test(after, decAfter))
}
