import { describe, expect, it } from 'vitest'
import { getBeer } from '../data/beers'
import { ACTIVITY_WINDOW_MS, avatarExtras, buildAvatar, HIDDEN_BEER_COLOR, stageFor } from './avatar'
import { NEUTRAL_VECTOR } from './dna'

describe('avatar', () => {
  it('evolves with decoded percentage', () => {
    expect(stageFor(0)).toBe('hidden')
    expect(stageFor(29)).toBe('hidden')
    expect(stageFor(30)).toBe('raw')
    expect(stageFor(69)).toBe('raw')
    expect(stageFor(70)).toBe('full')
  })
  it('hides colour and accessory until decoded', () => {
    const hidden = buildAvatar('herb', 10)
    expect(hidden.beerColor).toBe(HIDDEN_BEER_COLOR)
    expect(hidden.accessory).toBe('none')
    const raw = buildAvatar('herb', 50)
    expect(raw.beerColor).not.toBe(HIDDEN_BEER_COLOR)
    expect(raw.accessory).toBe('none')
    expect(buildAvatar('herb', 100).accessory).toBe('Brow')
  })
  it('each archetype has a distinct glass character', () => {
    expect(buildAvatar('philosoph').handle).toBe(true)
    expect(buildAvatar('abenteurer').glass).toBe('tulpe')
    expect(buildAvatar('probierer').eyes).toBe('Curious')
  })

  it('becomes a Stammgast (Bierdeckel) at 25 ratings once decoded', () => {
    expect(stageFor(100, 24)).toBe('full')
    expect(stageFor(100, 25)).toBe('stammgast')
    expect(stageFor(50, 40)).toBe('raw')
    expect(buildAvatar('herb', 100, { total: 30 }).accessory).toBe('Brow')
  })

  it('shows at most two stickers, most prestigious first, never while hidden', () => {
    const unlocked = ['first-date', 'ehrlich', 'entschluesselt', 'hopfen-herz']
    expect(buildAvatar('herb', 100, { unlocked }).stickers).toEqual(['entschluesselt', 'hopfen-herz'])
    expect(buildAvatar('herb', 10, { unlocked }).stickers).toEqual([])
    expect(buildAvatar('herb', 100, { unlocked: ['first-date'] }).stickers).toEqual([])
  })

  it('takes the favourite beer colour only when grown up', () => {
    expect(buildAvatar('herb', 100, { favoriteColor: '#123456' }).beerColor).toBe('#123456')
    expect(buildAvatar('herb', 50, { favoriteColor: '#123456' }).beerColor).not.toBe('#123456')
  })

  it('derives activity and favourite from ratings, reproducibly for a given now', () => {
    const now = 1_800_000_000_000
    const ratings = {
      jever: { rating: 'LIKE' as const, at: now - 1000 },
      guinness: { rating: 'LIKE' as const, at: now - ACTIVITY_WINDOW_MS - 1 },
      becks: { rating: 'DISLIKE' as const, at: now - 2000 },
    }
    const taste = { ...NEUTRAL_VECTOR, ...getBeer('jever').taste }
    const x = avatarExtras(ratings, taste, ['ehrlich'], now)
    expect(x.total).toBe(3)
    expect(x.activity).toBeCloseTo(0.2)
    expect(x.favoriteColor).toBe(getBeer('jever').color)
    expect(avatarExtras(ratings, taste, [], now)).toEqual(avatarExtras(ratings, taste, [], now))
  })
})
