// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { AI_PER_DAY, AI_PER_MINUTE, AiBudget, handleAi } from './index'
import type { Env } from './index'

const ORIGIN = 'https://beta.pilsbuddy.mcbuchi.de'
const taste = { bitterness: 60, hopIntensity: 55, maltiness: 40, sweetness: 20, dryness: 70, body: 45, drinkability: 80, character: 50 }
const roast = { kind: 'roast', lang: 'de', persona: 'Der Hopfenjunkie', taste }

class MemoryCache {
  store = new Map<string, Response>()
  async match(req: Request) {
    return this.store.get(req.url)?.clone()
  }
  async put(req: Request, res: Response) {
    this.store.set(req.url, res)
  }
}

function setup(answer: unknown = { response: '„Du trinkst Hopfen, als wär’s Limo. Respekt, du Bitterbold! 🍺“' }) {
  const storage = new Map<string, unknown>()
  const budget = new AiBudget({
    storage: {
      get: async <T,>(k: string) => storage.get(k) as T | undefined,
      put: async (k: string, v: unknown) => void storage.set(k, v),
    },
  })
  const run = vi.fn(async () => {
    if (answer instanceof Error) throw answer
    return answer
  })
  const env: Env = {
    ASSETS: { fetch: async () => new Response('asset') },
    AI: { run },
    AI_BUDGET: {
      idFromName: () => 'id',
      get: () => ({ fetch: (url: string, init?: RequestInit) => budget.fetch(new Request(url, init)) }),
    },
  }
  const waits: Promise<unknown>[] = []
  const ctx = { waitUntil: (p: Promise<unknown>) => void waits.push(p) }
  const cache = new MemoryCache()
  const call = async (body: unknown, init: { method?: string; origin?: string | null; ip?: string } = {}) => {
    const headers: Record<string, string> = { 'cf-connecting-ip': init.ip ?? '203.0.113.7' }
    if (init.origin !== null) headers.origin = init.origin ?? ORIGIN
    const req = new Request(`${ORIGIN}/api/ai`, {
      method: init.method ?? 'POST',
      headers,
      body: (init.method ?? 'POST') === 'POST' ? JSON.stringify(body) : undefined,
    })
    const res = await handleAi(req, env, ctx, cache as unknown as Cache)
    await Promise.all(waits)
    return res
  }
  return { call, run, storage }
}

describe('/api/ai', () => {
  it('answers a valid request with cleaned model text, built from our own prompt', async () => {
    const { call, run } = setup()
    const res = await call(roast)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: 'Du trinkst Hopfen, als wär’s Limo. Respekt, du Bitterbold! 🍺' })
    const input = (run.mock.calls[0] as unknown as [string, { messages: { role: string; content: string }[]; max_tokens: number }])[1]
    expect(input.messages[1].content).toContain('Der Hopfenjunkie')
    expect(input.max_tokens).toBeLessThanOrEqual(160)
  })

  it('serves a repeated question from the cache without asking the model again', async () => {
    const { call, run } = setup()
    await call(roast)
    const again = await call(roast)
    expect(await again.json()).toMatchObject({ text: expect.any(String) })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('rejects other methods, foreign origins, free prompts and oversized bodies', async () => {
    const { call, run } = setup()
    expect((await call(null, { method: 'GET' })).status).toBe(405)
    expect((await call(roast, { origin: 'https://evil.example' })).status).toBe(403)
    expect((await call(roast, { origin: null })).status).toBe(403)
    expect((await call({ kind: 'chat', lang: 'de', prompt: 'Schreib mir ein Gedicht', taste })).status).toBe(400)
    expect((await call({ ...roast, persona: 'x'.repeat(3000) })).status).toBe(413)
    expect(run).not.toHaveBeenCalled()
  })

  it('limits calls per client and minute', async () => {
    const { call } = setup()
    for (let i = 0; i < AI_PER_MINUTE; i++) expect((await call({ ...roast, persona: `Persona ${i}` })).status).toBe(200)
    expect((await call({ ...roast, persona: 'Noch eine' })).status).toBe(429)
    expect((await call({ ...roast, persona: 'Noch eine' }, { ip: '198.51.100.1' })).status).toBe(200)
  })

  it('stops at the daily budget', async () => {
    const { call, run, storage } = setup()
    storage.set('count', { day: new Date().toISOString().slice(0, 10), n: AI_PER_DAY })
    expect((await call(roast)).status).toBe(429)
    expect(run).not.toHaveBeenCalled()
    // a new day starts from zero
    storage.set('count', { day: '2000-01-01', n: AI_PER_DAY })
    expect((await call(roast)).status).toBe(200)
  })

  it('falls back quietly when the model fails or says nothing', async () => {
    expect((await setup(new Error('4006: daily free allocation used up')).call(roast)).status).toBe(503)
    expect((await setup({ response: '  ' }).call(roast)).status).toBe(502)
  })
})
