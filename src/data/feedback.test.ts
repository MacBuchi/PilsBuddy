import { afterEach, describe, expect, it, vi } from 'vitest'
import { DRAFT_KEY, platformOf, readDraft, sendFeedback, validFeedback, writeDraft } from './feedback'

const meta = { app_version: 'a74e951', platform: 'iOS · App' }
const answer = (status: number, body?: unknown) => vi.fn(async (_url: string, _init?: RequestInit) => new Response(body === undefined ? null : JSON.stringify(body), { status }))

afterEach(() => vi.unstubAllGlobals())

describe('platformOf', () => {
  it('names only the system and whether it runs as app', () => {
    expect(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15', true)).toBe('iOS · App')
    expect(platformOf('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140', false)).toBe('Android · Browser')
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', false)).toBe('macOS · Browser')
    expect(platformOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false)).toBe('Windows · Browser')
    expect(platformOf('', false)).toBe('Andere · Browser')
  })
})

describe('sendFeedback', () => {
  it('posts type, trimmed text, build and platform – nothing else', async () => {
    const f = answer(201)
    expect(await sendFeedback('bug', '  Swipe hängt  ', f as unknown as typeof fetch, meta)).toBe('ok')
    const [url, init] = f.mock.calls[0]
    expect(url).toMatch(/\/rest\/v1\/feedback$/)
    expect(JSON.parse(init!.body as string)).toEqual({ type: 'bug', message: 'Swipe hängt', app_version: 'a74e951', platform: 'iOS · App' })
    expect((init!.headers as Record<string, string>).Prefer).toBe('return=minimal')
  })

  it('maps the server answers', async () => {
    expect(await sendFeedback('bug', 'x', answer(201) as unknown as typeof fetch, meta)).toBe('invalid')
    expect(await sendFeedback('bug', 'Doppelt', answer(400, { code: 'P0001', message: 'feedback duplicate' }) as unknown as typeof fetch, meta)).toBe('duplicate')
    expect(await sendFeedback('bug', 'Zu viel', answer(400, { code: 'P0001', message: 'feedback rate limit' }) as unknown as typeof fetch, meta)).toBe('busy')
    expect(await sendFeedback('bug', 'Server weg', answer(503) as unknown as typeof fetch, meta)).toBe('offline')
    const down = vi.fn(async () => Promise.reject(new TypeError('offline')))
    expect(await sendFeedback('feature', 'Kein Netz', down as unknown as typeof fetch, meta)).toBe('offline')
  })

  it('validates length like the database', () => {
    expect(validFeedback('  ab ')).toBe(false)
    expect(validFeedback('abc')).toBe(true)
    expect(validFeedback('x'.repeat(2001))).toBe(false)
  })
})

describe('draft', () => {
  it('survives until sent; an empty text removes it', () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => stored.get(k) ?? null,
      setItem: (k: string, v: string) => void stored.set(k, v),
      removeItem: (k: string) => void stored.delete(k),
    })
    expect(readDraft()).toEqual({ type: 'feature', message: '' })
    writeDraft({ type: 'bug', message: 'Halb getippt' })
    expect(readDraft()).toEqual({ type: 'bug', message: 'Halb getippt' })
    writeDraft({ type: 'bug', message: '  ' })
    expect(stored.has(DRAFT_KEY)).toBe(false)
  })
})
