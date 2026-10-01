import { describe, expect, it } from 'vitest'
import { encodeBuddy } from '../domain/buddyLink'
import { withIncomingBuddy } from './AppContext'
import { initialState } from './reducer'
import { parseProfile, serializeProfile } from './storage'

const link = encodeBuddy(4242, { jever: { rating: 'LIKE', at: 1 }, becks: { rating: 'DISLIKE', at: 2 } })
const base = (onboarded: boolean) =>
  initialState({ ratings: {}, ageConfirmed: true, onboarded, dark: false, buddyNo: 7, seen: [], buddy: null })

describe('incoming buddy link', () => {
  it('stores the buddy; onboarded users land on the comparison', () => {
    const s = withIncomingBuddy(base(true), link)
    expect(s.profile.buddy?.no).toBe(4242)
    expect(s.screen).toBe('matches')
    expect(s.matchTab).toBe('menschen')
  })

  it('new users keep their onboarding path', () => {
    const s = withIncomingBuddy(base(false), link)
    expect(s.profile.buddy?.no).toBe(4242)
    expect(s.screen).toBe('welcome')
  })

  it('ignores junk and your own link', () => {
    const b = base(true)
    expect(withIncomingBuddy(b, 'nope')).toBe(b)
    const own = { ...b, profile: { ...b.profile, buddyNo: 4242 } }
    expect(withIncomingBuddy(own, link)).toBe(own)
  })

  it('the buddy survives a reload', () => {
    const s = withIncomingBuddy(base(true), link)
    expect(parseProfile(serializeProfile(s.profile))?.buddy?.no).toBe(4242)
  })
})
