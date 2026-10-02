import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  checkSubmission,
  emptySubmission,
  forgetSubmissions,
  normalizeLink,
  parseAbv,
  PER_DAY,
  readSubmissionDraft,
  sendSubmission,
  SUB_DRAFT_KEY,
  SUB_SENT_KEY,
  toRow,
  writeSubmissionDraft,
} from './beerSubmission'
import type { Submission } from './beerSubmission'

const meta = { app_version: 'a74e951', platform: 'iOS · App' }
const answer = (status: number, body?: unknown) =>
  vi.fn(async (_url: string, _init?: RequestInit) => new Response(body === undefined ? null : JSON.stringify(body), { status }))
const known = { id: 'osm-n4711', name: 'Testbräu' }
const sub = (p: Partial<Submission>): Submission => ({ ...emptySubmission(known), ...p })
const NOW = Date.UTC(2026, 9, 2, 12)

beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => void stored.set(k, v),
    removeItem: (k: string) => void stored.delete(k),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('parseAbv / normalizeLink', () => {
  it('reads German and English decimals, rejects nonsense', () => {
    expect(parseAbv('4,9')).toBe(4.9)
    expect(parseAbv(' 5.25 % ')).toBe(5.3)
    expect(parseAbv('')).toBeNull()
    expect(parseAbv('viel')).toBeUndefined()
    expect(parseAbv('45')).toBeUndefined()
  })

  it('adds https, keeps only http(s) links with a real host', () => {
    expect(normalizeLink('brauerei.de/biere')).toBe('https://brauerei.de/biere')
    expect(normalizeLink('http://brauerei.at')).toBe('http://brauerei.at/')
    expect(normalizeLink('')).toBeNull()
    expect(normalizeLink('javascript:alert(1)')).toBeUndefined()
    expect(normalizeLink('localhost:8080')).toBeUndefined()
    expect(normalizeLink('kein link')).toBeUndefined()
  })
})

describe('checkSubmission', () => {
  it('needs a brewery and a link or a beer name', () => {
    expect(checkSubmission(sub({ beerName: 'Kellerpils' }))).toBeNull()
    expect(checkSubmission(sub({ link: 'testbraeu.de/pils' }))).toBeNull()
    expect(checkSubmission(sub({}))).toBe('what')
    expect(checkSubmission(sub({ breweryName: ' ', beerName: 'X' }))).toBe('brewery')
  })

  it('a typed brewery needs a place', () => {
    const typed = { ...emptySubmission(), breweryName: 'Hinterhofbräu', beerName: 'Hell' }
    expect(checkSubmission(typed)).toBe('place')
    expect(checkSubmission({ ...typed, breweryPlace: '74906' })).toBeNull()
  })

  it('flags a broken link or ABV', () => {
    expect(checkSubmission(sub({ beerName: 'X', link: 'ftp://x.de' }))).toBe('link')
    expect(checkSubmission(sub({ beerName: 'X', abv: 'stark' }))).toBe('abv')
  })
})

describe('toRow', () => {
  it('sends only the columns the API allows, empty ones left out', () => {
    expect(toRow(sub({ beerName: ' Kellerpils ', style: 'Kellerbier', abv: '5,2', link: ' ', note: '' }))).toEqual({
      brewery_id: 'osm-n4711',
      brewery_name: 'Testbräu',
      beer_name: 'Kellerpils',
      style: 'Kellerbier',
      abv: 5.2,
    })
    expect(toRow({ ...emptySubmission(), breweryName: 'Hinterhofbräu', breweryPlace: ' Bad Rappenau ', link: 'hinterhof.de', style: 'Fantasie' })).toEqual({
      brewery_name: 'Hinterhofbräu',
      brewery_place: 'Bad Rappenau',
      link: 'https://hinterhof.de/',
    })
  })
})

describe('sendSubmission', () => {
  it('posts the row plus build and platform', async () => {
    const f = answer(201)
    expect(await sendSubmission(sub({ beerName: 'Kellerpils' }), f as unknown as typeof fetch, meta, NOW)).toBe('ok')
    const [url, init] = f.mock.calls[0]
    expect(url).toMatch(/\/rest\/v1\/beer_submissions$/)
    expect(JSON.parse(init!.body as string)).toEqual({ brewery_id: 'osm-n4711', brewery_name: 'Testbräu', beer_name: 'Kellerpils', ...meta })
  })

  it('maps the server answers', async () => {
    const s = sub({ beerName: 'Kellerpils' })
    expect(await sendSubmission(sub({}), answer(201) as unknown as typeof fetch, meta, NOW)).toBe('invalid')
    expect(await sendSubmission(s, answer(400, { message: 'submission duplicate' }) as unknown as typeof fetch, meta, NOW)).toBe('duplicate')
    expect(await sendSubmission(s, answer(400, { message: 'submission rate limit' }) as unknown as typeof fetch, meta, NOW)).toBe('busy')
    expect(await sendSubmission(s, answer(503) as unknown as typeof fetch, meta, NOW)).toBe('offline')
    const down = vi.fn(async () => Promise.reject(new TypeError('offline')))
    expect(await sendSubmission(s, down as unknown as typeof fetch, meta, NOW)).toBe('offline')
  })

  it(`allows ${PER_DAY} reports a day per device`, async () => {
    const f = answer(201)
    for (let i = 0; i < PER_DAY; i++) expect(await sendSubmission(sub({ beerName: `Sorte ${i}` }), f as unknown as typeof fetch, meta, NOW + i)).toBe('ok')
    expect(await sendSubmission(sub({ beerName: 'Eine zu viel' }), f as unknown as typeof fetch, meta, NOW + 10)).toBe('limit')
    expect(f).toHaveBeenCalledTimes(PER_DAY)
    expect(await sendSubmission(sub({ beerName: 'Am Tag danach' }), f as unknown as typeof fetch, meta, NOW + 25 * 3600 * 1000)).toBe('ok')
  })
})

describe('drafts', () => {
  it('keeps an unsent report for the same brewery, starts fresh for another', () => {
    writeSubmissionDraft(sub({ beerName: 'Kellerpils', abv: '5,2' }))
    expect(readSubmissionDraft(known)).toMatchObject({ breweryId: 'osm-n4711', beerName: 'Kellerpils', abv: '5,2' })
    expect(readSubmissionDraft({ id: 'osm-n1', name: 'Andere' })).toEqual(emptySubmission({ id: 'osm-n1', name: 'Andere' }))
    expect(readSubmissionDraft()).toMatchObject({ breweryId: 'osm-n4711', beerName: 'Kellerpils' })
  })

  it('stores nothing for an untouched form and survives junk', () => {
    writeSubmissionDraft(emptySubmission(known))
    expect(localStorage.getItem(SUB_DRAFT_KEY)).toBeNull()
    localStorage.setItem(SUB_DRAFT_KEY, '{"style":"Fantasie","link":7}')
    expect(readSubmissionDraft()).toEqual(emptySubmission())
  })

  it('forgets draft and send log on profile reset', () => {
    localStorage.setItem(SUB_DRAFT_KEY, '{}')
    localStorage.setItem(SUB_SENT_KEY, '[1]')
    forgetSubmissions()
    expect(localStorage.getItem(SUB_DRAFT_KEY)).toBeNull()
    expect(localStorage.getItem(SUB_SENT_KEY)).toBeNull()
  })
})
