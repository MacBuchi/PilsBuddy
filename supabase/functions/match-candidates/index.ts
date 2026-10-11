// PilsBuddy C2/C3: the Pils-Match feed (Absprache 2026-10-11).
//
//   POST {}   (Authorization: the user's JWT) → { me: { visible, handle }, people: Person[] }
//
// Only for visible profiles with a handle (whoever wants to see others must be findable too). People are the visible
// profiles whose taste vector is closest to the caller's, plus everyone the caller is buddies with (clinked in both
// directions); blocks hide both sides from each other. Per person: handle and the ratings as the buddy link carries
// them (no timestamps, no UNKNOWN) – the app computes persona, match, shared beers and tips itself.
// Whether someone clinked the caller is only told once the caller clinked back (mutual).
import { createClient } from 'npm:@supabase/supabase-js@2.117.2' // pinned: same version as the app

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
/** Most recently active visible profiles considered, and how many of them the feed shows. */
const POOL = 500
const FEED = 30
const AXES = ['bitterness', 'hopIntensity', 'maltiness', 'sweetness', 'dryness', 'body', 'drinkability', 'character']
const CODE: Record<string, string> = { LIKE: 'L', DISLIKE: 'D', WANT_TO_TRY: 'T', KNOW: 'K' }

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function caller(req: Request): Promise<string | null> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!jwt) return null
  const { data, error } = await admin.auth.getUser(jwt)
  return error || !data.user ? null : data.user.id
}

type Taste = Record<string, number> | null
interface ProfileRow {
  id: string
  handle: string | null
  taste: Taste
}

function distance(a: Taste, b: Taste): number {
  if (!a || !b) return Number.POSITIVE_INFINITY
  return Math.sqrt(AXES.reduce((sum, k) => sum + ((Number(a[k]) || 0) - (Number(b[k]) || 0)) ** 2, 0))
}

async function feed(userId: string): Promise<Response> {
  const { data: me, error: meError } = await admin
    .from('profiles')
    .select('id, handle, taste, visible')
    .eq('id', userId)
    .maybeSingle<ProfileRow & { visible: boolean }>()
  if (meError) return json({ error: 'db' }, 500)
  if (!me?.visible || !me.handle) return json({ me: { visible: false, handle: me?.handle ?? null }, people: [] })

  const [clinks, blocks, pool] = await Promise.all([
    admin.from('match_clinks').select('from_id, to_id').or(`from_id.eq.${userId},to_id.eq.${userId}`),
    admin.from('match_blocks').select('from_id, to_id').or(`from_id.eq.${userId},to_id.eq.${userId}`),
    admin
      .from('profiles')
      .select('id, handle, taste')
      .eq('visible', true)
      .not('handle', 'is', null)
      .neq('id', userId)
      .order('updated_at', { ascending: false })
      .limit(POOL)
      .returns<ProfileRow[]>(),
  ])
  if (clinks.error || blocks.error || pool.error) return json({ error: 'db' }, 500)

  const other = (r: { from_id: string; to_id: string }) => (r.from_id === userId ? r.to_id : r.from_id)
  const blocked = new Set((blocks.data ?? []).map(other))
  const mine = new Set((clinks.data ?? []).filter((r) => r.from_id === userId).map((r) => r.to_id))
  const theirs = new Set((clinks.data ?? []).filter((r) => r.to_id === userId).map((r) => r.from_id))
  const mutual = (id: string) => mine.has(id) && theirs.has(id)

  const candidates = (pool.data ?? []).filter((p) => !blocked.has(p.id))
  const byTaste = [...candidates].sort((a, b) => distance(me.taste, a.taste) - distance(me.taste, b.taste) || a.id.localeCompare(b.id))
  const shown = new Map(byTaste.slice(0, FEED).map((p) => [p.id, p]))
  for (const p of candidates) if (mutual(p.id)) shown.set(p.id, p)
  // buddies who dropped out of the pool (inactive for long) still belong to the list
  const missing = [...mine].filter((id) => mutual(id) && !blocked.has(id) && !shown.has(id))
  if (missing.length) {
    const { data } = await admin
      .from('profiles')
      .select('id, handle, taste')
      .in('id', missing)
      .eq('visible', true)
      .not('handle', 'is', null)
      .returns<ProfileRow[]>()
    for (const p of data ?? []) shown.set(p.id, p)
  }

  const ids = [...shown.keys()]
  const ratings: Record<string, Record<string, string[]>> = {}
  for (let from = 0; ids.length; from += 1000) {
    const { data, error } = await admin
      .from('ratings')
      .select('user_id, beer_id, rating')
      .in('user_id', ids)
      .eq('deleted', false)
      .neq('rating', 'UNKNOWN')
      .order('user_id')
      .order('beer_id')
      .range(from, from + 999)
    if (error) return json({ error: 'db' }, 500)
    for (const r of data ?? []) ((ratings[r.user_id] ??= {})[CODE[r.rating]] ??= []).push(r.beer_id)
    if (!data || data.length < 1000) break
  }

  const people = [...shown.values()].map((p) => ({
    id: p.id,
    handle: p.handle,
    ratings: ratings[p.id] ?? {},
    mine: mine.has(p.id),
    mutual: mutual(p.id),
  }))
  return json({ me: { visible: true, handle: me.handle }, people })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const userId = await caller(req)
  if (!userId) return json({ error: 'auth' }, 401)
  return feed(userId)
})
