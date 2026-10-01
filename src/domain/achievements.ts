import { DECK_ORDER } from '../data/beers'
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
}

export function keptPromises(ratings: Ratings): number {
  return Object.values(ratings).filter((e) => e.previous === 'WANT_TO_TRY' && e.rating !== 'WANT_TO_TRY').length
}

export function progressOf(ratings: Ratings, games?: GamesProgress): Progress {
  const counts = countRatings(ratings)
  return { counts, decoded: decodedPercent(counts.total), kept: keptPromises(ratings), quartettWins: games?.quartett.won ?? 0 }
}

export interface AchievementDef {
  id: string
  title: string
  desc: string
  /** Phosphor icon name, resolved in the UI. */
  icon: 'heart' | 'crown' | 'binoculars' | 'beer-stein' | 'hand-waving' | 'dna' | 'fire' | 'medal' | 'package' | 'handshake' | 'cards'
  test: (c: RatingCounts, decoded: number, p: Progress) => boolean
  /** Big ones get a one-time full-screen moment instead of a toast. */
  moment?: boolean
}

export interface Achievement extends AchievementDef {
  unlocked: boolean
}

/** Light gamification only – a handful of badges, none of them nagging. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-date', title: 'Erstes Date', desc: '1 Bier gedatet', icon: 'heart', test: (c) => c.total >= 1 },
  { id: 'pils-neuling', title: 'Pils-Neuling', desc: '10 Biere gedatet', icon: 'beer-stein', test: (c) => c.total >= 10 },
  { id: 'hohe-ansprueche', title: 'Hohe Ansprüche', desc: '5 Körbe verteilt', icon: 'crown', test: (c) => c.DISLIKE >= 5 },
  { id: 'neugiernase', title: 'Neugiernase', desc: '3× Probieren', icon: 'binoculars', test: (c) => c.WANT_TO_TRY >= 3 },
  { id: 'ehrlich', title: 'Ehrlich', desc: '3× „Kenn ich nicht“', icon: 'hand-waving', test: (c) => c.UNKNOWN >= 3 },
  { id: 'entschluesselt', title: 'Entschlüsselt', desc: 'DNA zu 100 %', icon: 'dna', test: (_c, dec) => dec >= 100, moment: true },
  {
    id: 'wort-gehalten',
    title: 'Wort gehalten',
    desc: '3 von der Probierliste probiert',
    icon: 'handshake',
    test: (_c, _d, p) => p.kept >= 3,
    moment: true,
  },
  { id: 'hopfen-herz', title: 'Hopfen-Herz', desc: '15 Herzen vergeben', icon: 'fire', test: (c) => c.LIKE >= 15, moment: true },
  { id: 'pils-fluesterer', title: 'Pils-Flüsterer', desc: '25 Biere gedatet', icon: 'medal', test: (c) => c.total >= 25, moment: true },
  {
    id: 'kasten-kenner',
    title: 'Kasten-Kenner',
    desc: `Alle ${DECK_ORDER.length} Biere gedatet`,
    icon: 'package',
    test: (c) => c.total >= DECK_ORDER.length,
    moment: true,
  },
  {
    id: 'quartett-koenig',
    title: 'Quartett-König',
    desc: '3× den Kneipen-Bot geschlagen',
    icon: 'cards',
    test: (_c, _d, p) => p.quartettWins >= 3,
    moment: true,
  },
]

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
