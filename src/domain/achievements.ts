import { DECK_ORDER } from '../data/beers'
import { COPY, fill } from '../data/copy'
import { isRegionalId } from './deck'
import { countRatings, decodedPercent } from './dna'
import type { RatingCounts, Ratings } from './types'

/** Only what achievements need from the mini games (shape of Profile.games). */
export interface GamesProgress {
  quartett: { won: number }
}

/** What achievements are judged on. */
export interface Progress {
  counts: RatingCounts
  decoded: number
  /** Beers that were on the Probierliste and got a real verdict later. */
  kept: number
  /** Bier-Quartett games won against the bot. */
  quartettWins: number
  /** Beers from the surroundings (Stufe R) with a heart. */
  regionalLikes: number
}

export function keptPromises(ratings: Ratings): number {
  return Object.values(ratings).filter((e) => e.previous === 'WANT_TO_TRY' && e.rating !== 'WANT_TO_TRY').length
}

export function regionalLikes(ratings: Ratings): number {
  return Object.entries(ratings).filter(([id, e]) => isRegionalId(id) && e.rating === 'LIKE').length
}

export function progressOf(ratings: Ratings, games?: GamesProgress): Progress {
  const counts = countRatings(ratings)
  return {
    counts,
    decoded: decodedPercent(counts.total),
    kept: keptPromises(ratings),
    quartettWins: games?.quartett.won ?? 0,
    regionalLikes: regionalLikes(ratings),
  }
}

type AchievementId = keyof typeof COPY.achievements

export interface AchievementDef {
  id: AchievementId
  title: string
  desc: string
  /** Phosphor icon name, resolved in the UI. */
  icon: 'heart' | 'crown' | 'binoculars' | 'beer-stein' | 'hand-waving' | 'dna' | 'fire' | 'medal' | 'package' | 'handshake' | 'cards' | 'map-pin'
  test: (c: RatingCounts, decoded: number, p: Progress) => boolean
  /** Big ones get a one-time full-screen moment instead of a toast. */
  moment?: boolean
}

export interface Achievement extends AchievementDef {
  unlocked: boolean
}

/** Light gamification only – a handful of badges, none of them nagging. */
const DEFS: Omit<AchievementDef, 'title' | 'desc'>[] = [
  { id: 'first-date', icon: 'heart', test: (c) => c.total >= 1 },
  { id: 'pils-neuling', icon: 'beer-stein', test: (c) => c.total >= 10 },
  { id: 'hohe-ansprueche', icon: 'crown', test: (c) => c.DISLIKE >= 5 },
  { id: 'neugiernase', icon: 'binoculars', test: (c) => c.WANT_TO_TRY >= 3 },
  { id: 'ehrlich', icon: 'hand-waving', test: (c) => c.UNKNOWN >= 3 },
  { id: 'entschluesselt', icon: 'dna', test: (_c, dec) => dec >= 100, moment: true },
  { id: 'wort-gehalten', icon: 'handshake', test: (_c, _d, p) => p.kept >= 3, moment: true },
  { id: 'hopfen-herz', icon: 'fire', test: (c) => c.LIKE >= 15, moment: true },
  { id: 'pils-fluesterer', icon: 'medal', test: (c) => c.total >= 25, moment: true },
  { id: 'kasten-kenner', icon: 'package', test: (c) => c.total >= DECK_ORDER.length, moment: true },
  { id: 'quartett-koenig', icon: 'cards', test: (_c, _d, p) => p.quartettWins >= 3, moment: true },
  { id: 'lokalpatriot', icon: 'map-pin', test: (_c, _d, p) => p.regionalLikes >= 3, moment: true },
]

export const ACHIEVEMENTS: AchievementDef[] = DEFS.map((a) => ({
  ...a,
  title: COPY.achievements[a.id].title,
  desc: fill(COPY.achievements[a.id].desc, { n: DECK_ORDER.length }),
}))

const passes = (a: AchievementDef, p: Progress) => a.test(p.counts, p.decoded, p)

export function evaluateAchievements(p: Progress): Achievement[] {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: passes(a, p) }))
}

/** Ids of all unlocked achievements. */
export function unlockedIds(p: Progress): string[] {
  return ACHIEVEMENTS.filter((a) => passes(a, p)).map((a) => a.id)
}

/** Achievements newly unlocked between two states – for a toast when one pops. */
export function newlyUnlocked(before: Progress, after: Progress): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !passes(a, before) && passes(a, after))
}
