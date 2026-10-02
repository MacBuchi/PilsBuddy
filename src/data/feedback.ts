import { SUPABASE_KEY, SUPABASE_URL } from '../sync/config'

/**
 * In-app feedback („Wünsch dir was!“). Anonymous: the app sends the text, its type, the build id and a
 * coarse platform to the `feedback` table – no account, no ratings, no user agent. A bot turns each row
 * into a public GitHub issue (tool/feedback_bot.py). A draft survives a failed send or a closed sheet.
 */

export type FeedbackType = 'feature' | 'bug'
export const FEEDBACK_MIN = 3
export const FEEDBACK_MAX = 2000
export const DRAFT_KEY = 'pilsbuddy.feedback-draft'

export type SendResult = 'ok' | 'invalid' | 'duplicate' | 'busy' | 'offline'

/** „iOS · App“, „Android · Browser“, „macOS · Browser“ – enough to reproduce, not enough to fingerprint. */
export function platformOf(userAgent: string, standalone: boolean): string {
  const os = /iPhone|iPad|iPod/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac OS X|Macintosh/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux|CrOS/.test(userAgent)
            ? 'Linux'
            : 'Andere'
  return `${os} · ${standalone ? 'App' : 'Browser'}`
}

function currentPlatform(): string {
  try {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    return platformOf(navigator.userAgent, standalone)
  } catch {
    return 'Andere · Browser'
  }
}

export const validFeedback = (message: string) => {
  const n = message.trim().length
  return n >= FEEDBACK_MIN && n <= FEEDBACK_MAX
}

/** Sends one message. Never throws; the caller keeps the draft unless the result is 'ok'. */
export async function sendFeedback(
  type: FeedbackType,
  message: string,
  fetchFn: typeof fetch = fetch,
  meta = { app_version: __APP_BUILD__, platform: currentPlatform() },
): Promise<SendResult> {
  if (!validFeedback(message)) return 'invalid'
  try {
    const res = await fetchFn(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ type, message: message.trim(), ...meta }),
    })
    if (res.ok) return 'ok'
    const err = (await res.json().catch(() => null)) as { message?: string } | null
    if (err?.message === 'feedback duplicate') return 'duplicate'
    if (err?.message === 'feedback rate limit') return 'busy'
    return res.status >= 500 ? 'offline' : 'invalid'
  } catch {
    return 'offline'
  }
}

export interface Draft {
  type: FeedbackType
  message: string
}

export function readDraft(): Draft {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Partial<Draft> | null
    return { type: d?.type === 'bug' ? 'bug' : 'feature', message: typeof d?.message === 'string' ? d.message.slice(0, FEEDBACK_MAX) : '' }
  } catch {
    return { type: 'feature', message: '' }
  }
}

export function writeDraft(d: Draft): void {
  try {
    if (d.message.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* private mode – the draft lives as long as the sheet */
  }
}
