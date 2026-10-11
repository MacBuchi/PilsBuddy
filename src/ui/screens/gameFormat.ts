import { formatAbv } from '../../data/beers'
import { COPY } from '../../data/copy'
import { capacityOf, STEP_ML } from '../../domain/games/fill'
import type { Glass } from '../../domain/games/fill'
import { QUARTETT_STATS } from '../../domain/games/quartett'
import type { QuartettRound, StatKey } from '../../domain/games/quartett'

/** Formatting shared by the solo games and their room versions (E1, E2, E5). */

export type Mark = 'win' | 'lose' | 'tie'

export const STAT_LABEL = Object.fromEntries(QUARTETT_STATS.map((s) => [s.key, s.label])) as Record<StatKey, string>

export const show = (key: StatKey, v: number) => (key === 'abv' ? formatAbv(v) : String(v))

/** A round as seen by player 0. */
export const markOf = (r: QuartettRound): Mark => (r.outcome === 'tie' ? 'tie' : r.outcome === 0 ? 'win' : 'lose')

export const ml = (v: number) => `${v} ml`
export const litres = (v: number) => `${String(v / 1000).replace('.', COPY.app.decimal)} l`
/** The highest guess the picker offers: the brim, in whole steps. */
export const maxOf = (g: Glass) => Math.floor(capacityOf(g) / STEP_ML) * STEP_ML
export const startValue = (g: Glass) => Math.round(g.nominal / 2 / STEP_ML) * STEP_ML
