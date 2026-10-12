import { COPY, fill } from '../../data/copy'
import { winnings } from '../../domain/games/bierionaer'
import type { BierionaerGame } from '../../domain/games/bierionaer'

/** Shared by the Bierionär screens (E9 alone, E8 at the table). */
export const LETTERS = 'ABCD'
/** Suspense between „Einloggen“ and the reveal. */
export const LOCK_MS = 1300

export const kk = (n: number) => fill(COPY.bierionaer.prize, { n: n.toLocaleString(COPY.app.locale) })

export function bierEndTitle(game: BierionaerGame): string {
  if (game.status === 'won') return COPY.bierionaer.end.won
  if (game.status === 'walked') return COPY.bierionaer.end.walked
  return winnings(game) > 0 ? COPY.bierionaer.end.lost : COPY.bierionaer.end.lostZero
}
