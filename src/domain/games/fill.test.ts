import { describe, expect, it } from 'vitest'
import {
  brimOf,
  capacityOf,
  GLASS_BY_ID,
  GLASSES,
  guess,
  heightFor,
  isOver,
  isWin,
  maxScore,
  newFillGame,
  radiusAt,
  scoreGuess,
  STEP_ML,
  totalScore,
  volumeAt,
} from './fill'

describe('glass volumes (solid of revolution)', () => {
  it('every glass holds its nominal volume at the Eichstrich, with headroom above', () => {
    for (const g of GLASSES) {
      expect(volumeAt(g, g.mark)).toBeCloseTo(g.nominal, 6)
      expect(capacityOf(g)).toBeGreaterThan(g.nominal)
      expect(g.mark).toBeLessThan(brimOf(g))
    }
  })

  it('a straight section is a cone frustum: πh(r₀² + r₀r₁ + r₁²)/3', () => {
    const stange = GLASS_BY_ID.stange
    const r = radiusAt(stange, 0)
    const r50 = radiusAt(stange, 50)
    const frustum = (Math.PI * 50 * (r * r + r * r50 + r50 * r50)) / 3 / 1000
    expect(volumeAt(stange, 50)).toBeCloseTo(frustum, 9)
  })

  it('volume grows monotonically and is 0 at the bottom', () => {
    for (const g of GLASSES) {
      expect(volumeAt(g, 0)).toBe(0)
      let prev = 0
      for (let h = 5; h <= brimOf(g); h += 5) {
        const v = volumeAt(g, h)
        expect(v).toBeGreaterThan(prev)
        prev = v
      }
    }
  })

  it('heightFor inverts volumeAt and clamps at the brim', () => {
    for (const g of GLASSES) {
      for (const ml of [10, g.nominal / 3, g.nominal]) expect(volumeAt(g, heightFor(g, ml))).toBeCloseTo(ml, 3)
      expect(heightFor(g, 1e9)).toBe(brimOf(g))
    }
  })

  it('shape matters: half the height is half the beer only in the near-cylinders', () => {
    const half = (id: keyof typeof GLASS_BY_ID) => volumeAt(GLASS_BY_ID[id], GLASS_BY_ID[id].mark / 2) / GLASS_BY_ID[id].nominal
    expect(half('stange')).toBeCloseTo(0.5, 1)
    expect(half('mass')).toBeCloseTo(0.5, 1)
    expect(half('weizen')).toBeLessThan(0.4) // slim foot, wide top
    expect(half('tulpe')).toBeLessThan(0.48) // narrow bottom, belly above it
  })

  it('pins the calibrated shapes (change only on purpose)', () => {
    const rounded = Object.fromEntries(GLASSES.map((g) => [g.id, g.profile.map(([h, r]) => [h, Math.round(r * 10) / 10])]))
    expect(rounded).toMatchInlineSnapshot(`
      {
        "mass": [
          [
            0,
            43.1,
          ],
          [
            192,
            45,
          ],
        ],
        "stange": [
          [
            0,
            24.2,
          ],
          [
            125,
            25.2,
          ],
        ],
        "tulpe": [
          [
            0,
            6.9,
          ],
          [
            18,
            20.8,
          ],
          [
            55,
            29.5,
          ],
          [
            110,
            26.9,
          ],
          [
            150,
            22.5,
          ],
          [
            172,
            25.1,
          ],
        ],
        "weizen": [
          [
            0,
            20.8,
          ],
          [
            70,
            23.9,
          ],
          [
            130,
            23.9,
          ],
          [
            190,
            32.2,
          ],
          [
            228,
            37.4,
          ],
          [
            250,
            36.4,
          ],
        ],
        "willi": [
          [
            0,
            24.3,
          ],
          [
            35,
            29,
          ],
          [
            105,
            35.6,
          ],
          [
            145,
            31.8,
          ],
          [
            178,
            33.7,
          ],
        ],
      }
    `)
  })
})

describe('game', () => {
  it('the same seed pours the same glasses; every glass once', () => {
    const a = newFillGame(42)
    expect(newFillGame(42)).toEqual(a)
    expect(newFillGame(43)).not.toEqual(a)
    expect(a.rounds.map((r) => r.glass).sort()).toEqual(GLASSES.map((g) => g.id).sort())
  })

  it('fills are 10 ml steps between 15 % and 100 % of the nominal volume', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const r of newFillGame(seed).rounds) {
        const { nominal } = GLASS_BY_ID[r.glass]
        expect(r.ml % STEP_ML).toBe(0)
        expect(r.ml).toBeGreaterThanOrEqual(nominal * 0.15 - STEP_ML / 2)
        expect(r.ml).toBeLessThanOrEqual(nominal)
      }
    }
  })

  it('scores relative to the glass size, never below 0', () => {
    expect(scoreGuess({ glass: 'stange', ml: 100 }, 100)).toBe(100)
    expect(scoreGuess({ glass: 'stange', ml: 100 }, 110)).toBe(80) // 5 % of 200 ml off
    expect(scoreGuess({ glass: 'mass', ml: 500 }, 450)).toBe(80) // 5 % of 1 l off
    expect(scoreGuess({ glass: 'mass', ml: 500 }, 0)).toBe(0)
  })

  it('collects guesses until every glass is guessed; win at 70 %', () => {
    let g = newFillGame(7)
    for (const r of g.rounds) g = guess(g, r.ml)
    expect(isOver(g)).toBe(true)
    expect(totalScore(g)).toBe(maxScore(g))
    expect(isWin(g)).toBe(true)
    expect(guess(g, 1)).toBe(g)

    let bad = newFillGame(7)
    for (const r of bad.rounds) bad = guess(bad, r.ml + GLASS_BY_ID[r.glass].nominal * 0.1) // 60 points each
    expect(totalScore(bad)).toBe(300)
    expect(isWin(bad)).toBe(false)
  })
})
