import { describe, expect, it } from 'vitest'
import { encodeBuddy } from '../domain/buddyLink'
import { withIncomingBuddy, withLegalHash } from './AppContext'
import { initialState, NO_GAMES } from './reducer'
import { parseProfile, serializeProfile } from './storage'

const link = encodeBuddy(4242, { jever: { rating: 'LIKE', at: 1 }, becks: { rating: 'DISLIKE', at: 2 } })
const base = (onboarded: boolean) =>
  initialState({ ratings: {}, ageConfirmed: true, onboarded, dark: false, buddyNo: 7, seen: [], buddy: null, sync: { on: false, code: null }, games: NO_GAMES })

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

describe('legal deep link', () => {
  it('#impressum and #datenschutz open the legal page; back leads where the app would start', () => {
    const resumed = { ...base(true), screen: 'swipe' as const }
    for (const hash of ['#impressum', '#datenschutz']) {
      const s = withLegalHash(resumed, hash)
      expect(s.screen).toBe('legal')
      expect(s.prevScreen).toBe('swipe')
    }
    expect(withLegalHash(resumed, '#nope')).toBe(resumed)
    expect(withLegalHash(resumed, '')).toBe(resumed)
  })
})
