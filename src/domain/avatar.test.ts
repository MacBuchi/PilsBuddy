import { describe, expect, it } from 'vitest'
import { buildAvatar, HIDDEN_BEER_COLOR, stageFor } from './avatar'

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
})
