/**
 * PilsBuddy on Cloudflare: static assets (dist/) plus one route, /api/ai (Stufe D2). `run_worker_first` in
 * wrangler.jsonc sends only /api/* here – everything else is served by the assets layer without running code.
 *
 * /api/ai takes nothing but the two requests of `src/ai/prompt.ts` (persona roast, „Warum passt es zu mir?“),
 * builds the prompt itself and asks Workers AI. It stays inside the free allocation: identical questions come
 * from the cache, a Durable Object counts the day's model calls (hard cap) and a few per device and minute.
 */
import { AI_MAX_TOKENS, aiKey, buildPrompt, cleanAiText, parseAiRequest } from '../src/ai/prompt'

export const AI_MODEL = '@cf/meta/llama-3.2-3b-instruct'
/** Model calls per worker and UTC day. ~7 neurons each; beta + production together stay below the 10 000 free ones. */
export const AI_PER_DAY = 600
export const AI_PER_MINUTE = 4
const MAX_BODY = 2000
const CACHE_SECONDS = 7 * 24 * 3600

export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  AI: { run: (model: string, input: unknown) => Promise<unknown> }
  AI_BUDGET: {
    idFromName: (name: string) => unknown
    get: (id: unknown) => { fetch: (url: string, init?: RequestInit) => Promise<Response> }
  }
}

export interface Ctx {
  waitUntil: (p: Promise<unknown>) => void
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function handleAi(req: Request, env: Env, ctx: Ctx, cache: Cache): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405, { allow: 'POST' })
  // only the app itself – a browser always sends Origin on a POST
  const url = new URL(req.url)
  if (req.headers.get('origin') !== url.origin) return json({ error: 'origin' }, 403)
  const body = await req.text()
  if (body.length > MAX_BODY) return json({ error: 'size' }, 413)
  let parsed: unknown = null
  try {
    parsed = JSON.parse(body)
  } catch {
    // stays null
  }
  const ask = parseAiRequest(parsed)
  if (!ask) return json({ error: 'request' }, 400)

  const cacheKey = new Request(`${url.origin}/api/ai/cache/${await sha256(aiKey(ask))}`)
  const hit = await cache.match(cacheKey)
  if (hit) return json(await hit.json())

  const budget = env.AI_BUDGET.get(env.AI_BUDGET.idFromName('budget'))
  const ticket = await budget.fetch('https://budget/take', {
    method: 'POST',
    headers: { 'x-client': req.headers.get('cf-connecting-ip') ?? 'unknown' },
  })
  if (ticket.status === 429) return json({ error: 'limit' }, 429)

  let text: string | null = null
  try {
    const { system, user } = buildPrompt(ask)
    const out = (await env.AI.run(AI_MODEL, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: AI_MAX_TOKENS,
      temperature: 0.8,
    })) as { response?: unknown } | null
    text = cleanAiText(out?.response)
  } catch {
    // model unavailable or the account's allocation is used up – the app keeps its own texts
    return json({ error: 'ai' }, 503)
  }
  if (!text) return json({ error: 'empty' }, 502)
  const answer = { text }
  ctx.waitUntil(
    cache.put(cacheKey, new Response(JSON.stringify(answer), { headers: { 'cache-control': `public, max-age=${CACHE_SECONDS}` } })),
  )
  return json(answer)
}

interface DoStorage {
  get: <T>(key: string) => Promise<T | undefined>
  put: (key: string, value: unknown) => Promise<void>
}

/**
 * One instance per worker: the day's model calls (persisted) and calls per client and minute (memory only – the
 * IP address is never stored). Answers 200 = go, 429 = limit reached.
 */
export class AiBudget {
  storage: DoStorage
  minute = -1
  perClient = new Map<string, number>()

  constructor(state: { storage: DoStorage }) {
    this.storage = state.storage
  }

  async fetch(req: Request): Promise<Response> {
    const now = Date.now()
    const minute = Math.floor(now / 60_000)
    if (minute !== this.minute) {
      this.minute = minute
      this.perClient.clear()
    }
    const client = req.headers.get('x-client') ?? 'unknown'
    const mine = this.perClient.get(client) ?? 0
    if (mine >= AI_PER_MINUTE) return new Response('client', { status: 429 })
    const day = new Date(now).toISOString().slice(0, 10)
    const count = await this.storage.get<{ day: string; n: number }>('count')
    const used = count?.day === day ? count.n : 0
    if (used >= AI_PER_DAY) return new Response('day', { status: 429 })
    this.perClient.set(client, mine + 1)
    await this.storage.put('count', { day, n: used + 1 })
    return new Response('ok')
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const { pathname } = new URL(req.url)
    if (pathname === '/api/ai') return handleAi(req, env, ctx, (caches as unknown as { default: Cache }).default)
    if (pathname.startsWith('/api/')) return json({ error: 'not found' }, 404)
    return env.ASSETS.fetch(req)
  },
}
