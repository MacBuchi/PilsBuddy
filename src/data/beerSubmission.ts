import { SUPABASE_KEY, SUPABASE_URL } from '../sync/config'
import { STYLE_PROFILES } from '../domain/styleProfile'
import { currentPlatform } from './feedback'

/**
 * „Bier fehlt? Eintragen“ (R6). Anonymous like the feedback: the app sends the brewery (id of a brewery it
 * showed, or name + postcode/town), a link or the beer's facts, the build id and a coarse platform to the
 * table `beer_submissions` – nothing about the person. A bot turns each row into a GitHub issue; the
 * label `freigegeben` puts the beer into the regional catalogue (tool/beer_bot.py).
 */

export interface Submission {
  /** A brewery the app showed; null = typed by hand (then `breweryPlace` is required). */
  breweryId: string | null
  breweryName: string
  breweryPlace: string
  link: string
  beerName: string
  /** Canonical style of styleProfile.ts, '' = unknown. */
  style: string
  /** As typed, „4,9“. */
  abv: string
  note: string
}

export type SubmissionProblem = 'brewery' | 'place' | 'what' | 'link' | 'abv'
export type SubmitResult = 'ok' | 'invalid' | 'duplicate' | 'busy' | 'offline' | 'limit'

export const STYLES = Object.keys(STYLE_PROFILES)
export const NOTE_MAX = 500
export const PER_DAY = 5
export const SUB_DRAFT_KEY = 'pilsbuddy.submission-draft'
export const SUB_SENT_KEY = 'pilsbuddy.submissions-sent'
const DAY_MS = 24 * 60 * 60 * 1000

export const emptySubmission = (brewery?: { id: string; name: string } | null): Submission => ({
  breweryId: brewery?.id ?? null,
  breweryName: brewery?.name ?? '',
  breweryPlace: '',
  link: '',
  beerName: '',
  style: '',
  abv: '',
  note: '',
})

/** „4,9“, „4.9 %“ → 4.9; empty → null; anything else → undefined (a problem). */
export function parseAbv(text: string): number | null | undefined {
  const t = text.replace('%', '').replace(',', '.').trim()
  if (!t) return null
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return undefined
  const n = Math.round(Number(t) * 10) / 10
  return n <= 20 ? n : undefined
}

/** „brauerei.de/biere“ → „https://brauerei.de/biere“; only http(s) with a real host; empty → null. */
export function normalizeLink(text: string): string | null | undefined {
  const t = text.trim()
  if (!t) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !/\.[a-z]{2,}$/i.test(u.hostname)) return undefined
    return u.href.length <= 500 ? u.href : undefined
  } catch {
    return undefined
  }
}

/** The first thing to fix, or null when the report can go. */
export function checkSubmission(s: Submission): SubmissionProblem | null {
  if (s.breweryName.trim().length < 2) return 'brewery'
  if (!s.breweryId && s.breweryPlace.trim().length < 2) return 'place'
  const link = normalizeLink(s.link)
  if (link === undefined) return 'link'
  if (!link && !s.beerName.trim()) return 'what'
  if (parseAbv(s.abv) === undefined) return 'abv'
  return null
}

/** Exactly the columns the API lets the client write; empty fields are left out. */
export function toRow(s: Submission): Record<string, string | number> {
  const row: Record<string, string | number> = { brewery_name: s.breweryName.trim().slice(0, 200) }
  if (s.breweryId) row.brewery_id = s.breweryId
  else row.brewery_place = s.breweryPlace.trim().slice(0, 120)
  const link = normalizeLink(s.link)
  if (link) row.link = link
  if (s.beerName.trim()) row.beer_name = s.beerName.trim().slice(0, 200)
  if (STYLES.includes(s.style)) row.style = s.style
  const abv = parseAbv(s.abv)
  if (typeof abv === 'number') row.abv = abv
  if (s.note.trim()) row.note = s.note.trim().slice(0, NOTE_MAX)
  return row
}

function sentToday(now: number): number[] {
  try {
    const list = JSON.parse(localStorage.getItem(SUB_SENT_KEY) ?? '[]') as unknown
    return Array.isArray(list) ? list.filter((t): t is number => typeof t === 'number' && now - t < DAY_MS) : []
  } catch {
    return []
  }
}

/** Sends one report. Never throws; the caller keeps the draft unless the result is 'ok'. */
export async function sendSubmission(
  s: Submission,
  fetchFn: typeof fetch = fetch,
  meta = { app_version: __APP_BUILD__, platform: currentPlatform() },
  now = Date.now(),
): Promise<SubmitResult> {
  if (checkSubmission(s)) return 'invalid'
  const sent = sentToday(now)
  if (sent.length >= PER_DAY) return 'limit'
  try {
    const res = await fetchFn(`${SUPABASE_URL}/rest/v1/beer_submissions`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ ...toRow(s), ...meta }),
    })
    if (res.ok) {
      try {
        localStorage.setItem(SUB_SENT_KEY, JSON.stringify([...sent, now]))
      } catch {
        /* private mode – no device limit then, the server one still holds */
      }
      return 'ok'
    }
    const err = (await res.json().catch(() => null)) as { message?: string } | null
    if (err?.message === 'submission duplicate') return 'duplicate'
    if (err?.message === 'submission rate limit') return 'busy'
    return res.status >= 500 ? 'offline' : 'invalid'
  } catch {
    return 'offline'
  }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

/** The unsent report; opened for another brewery it starts fresh with that brewery. */
export function readSubmissionDraft(brewery?: { id: string; name: string } | null): Submission {
  try {
    const d = JSON.parse(localStorage.getItem(SUB_DRAFT_KEY) ?? 'null') as Partial<Record<keyof Submission, unknown>> | null
    if (!d) return emptySubmission(brewery)
    const draftBrewery = typeof d.breweryId === 'string' ? d.breweryId : null
    if (brewery && draftBrewery !== brewery.id) return emptySubmission(brewery)
    return {
      breweryId: brewery?.id ?? draftBrewery,
      breweryName: brewery?.name ?? str(d.breweryName, 200),
      breweryPlace: str(d.breweryPlace, 120),
      link: str(d.link, 500),
      beerName: str(d.beerName, 200),
      style: STYLES.includes(str(d.style, 40)) ? str(d.style, 40) : '',
      abv: str(d.abv, 8),
      note: str(d.note, NOTE_MAX),
    }
  } catch {
    return emptySubmission(brewery)
  }
}

export function writeSubmissionDraft(s: Submission): void {
  try {
    const touched = [s.link, s.beerName, s.abv, s.note, s.style, s.breweryId ? '' : s.breweryName, s.breweryPlace].some((v) => v.trim())
    if (touched) localStorage.setItem(SUB_DRAFT_KEY, JSON.stringify(s))
    else localStorage.removeItem(SUB_DRAFT_KEY)
  } catch {
    /* private mode – the draft lives as long as the sheet */
  }
}

/** „Profil zurücksetzen“: draft and the device's send log go too. */
export function forgetSubmissions(): void {
  for (const key of [SUB_DRAFT_KEY, SUB_SENT_KEY]) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* nothing stored */
    }
  }
}
