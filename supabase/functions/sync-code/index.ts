// PilsBuddy B2: the Sync-Code puts a second device into the same anonymous account
// (approved by the project owner on 2026-10-01: long-lived code, stored on the device, can be renewed).
//
//   POST { action: "create" }         (Authorization: the user's JWT) → { code }  – replaces the old one
//   POST { action: "redeem", code }   (no session needed)             → { token_hash } for auth.verifyOtp
//
// Only sha-256(code) is stored. To mint a session GoTrue needs an e-mail, so on first redeem the
// anonymous user gets an internal placeholder address (`.invalid` TLD, never mailed).
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // 32 letters, no 0/O/1/I
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

/** 16 letters from a 32-letter alphabet = 80 bits, shown as PILS-XXXX-XXXX-XXXX-XXXX. */
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return format([...bytes].map((b) => ALPHABET[b % 32]).join(''))
}

const format = (raw: string) => `PILS-${raw.match(/.{4}/g)!.join('-')}`

/** Accepts the code with or without prefix, dashes, spaces, lowercase. */
function normalize(code: string): string | null {
  const raw = code.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^PILS/, '')
  if (raw.length !== 16 || [...raw].some((c) => !ALPHABET.includes(c))) return null
  return format(raw)
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function create(req: Request): Promise<Response> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!jwt) return json({ error: 'auth' }, 401)
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user) return json({ error: 'auth' }, 401)
  const code = newCode()
  const { error: dbError } = await admin
    .from('sync_codes')
    .upsert({ user_id: data.user.id, code_hash: await sha256(code), created_at: new Date().toISOString(), last_used_at: null })
  if (dbError) return json({ error: 'db' }, 500)
  return json({ code })
}

async function redeem(input: unknown): Promise<Response> {
  const code = typeof input === 'string' ? normalize(input) : null
  if (!code) return json({ error: 'format' }, 400)
  const { data: row } = await admin.from('sync_codes').select('user_id').eq('code_hash', await sha256(code)).maybeSingle()
  if (!row) return json({ error: 'unknown' }, 404)

  const { data: found, error: userError } = await admin.auth.admin.getUserById(row.user_id)
  if (userError || !found.user) return json({ error: 'unknown' }, 404)
  let email = found.user.email
  if (!email) {
    email = `${row.user_id}@sync.pilsbuddy.invalid`
    const { error } = await admin.auth.admin.updateUserById(row.user_id, { email, email_confirm: true })
    if (error) return json({ error: 'auth' }, 500)
  }
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError || !link.properties?.hashed_token) return json({ error: 'auth' }, 500)
  await admin.from('sync_codes').update({ last_used_at: new Date().toISOString() }).eq('user_id', row.user_id)
  return json({ token_hash: link.properties.hashed_token })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  let body: { action?: unknown; code?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'body' }, 400)
  }
  if (body.action === 'create') return create(req)
  if (body.action === 'redeem') return redeem(body.code)
  return json({ error: 'action' }, 400)
})
