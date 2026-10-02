/**
 * UI language (I1). Chosen once at start – the stored choice, else the browser's languages (German if
 * any of them is German, English otherwise) – and fixed for the session: switching saves the choice and
 * reloads, so every text, beer and module-level label comes from the same language.
 * Kept apart from storage.ts because the text bank reads it while modules load (storage.ts itself
 * imports code that needs the text bank).
 */
export type Lang = 'de' | 'en'

export const LANGS: readonly Lang[] = ['de', 'en']
export const LANG_KEY = 'pilsbuddy.lang'

const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v)

/** The stored choice wins; otherwise the first browser language that is German or English decides. */
export function detectLang(stored: string | null, languages: readonly string[]): Lang {
  if (isLang(stored)) return stored
  for (const l of languages) {
    const base = l.toLowerCase().split('-')[0]
    if (isLang(base)) return base
  }
  return languages.length ? 'en' : 'de'
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function readStored(): string | null {
  try {
    return safeStorage()?.getItem(LANG_KEY) ?? null
  } catch {
    return null
  }
}

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : []
}

/** Dev/test override: `?lang=en` (not stored). */
function urlLang(): Lang | null {
  if (typeof location === 'undefined') return null
  const v = new URLSearchParams(location.search).get('lang')
  return isLang(v) ? v : null
}

/** Unit tests (jsdom says en-US) and scripts without a browser get German, like the texts they check. */
const fixedGerman = typeof window === 'undefined' || import.meta.env?.MODE === 'test'

/** The language of this session. */
export const LANG: Lang = urlLang() ?? (fixedGerman ? 'de' : detectLang(readStored(), browserLanguages()))

/** Saves the choice and restarts the app in that language. */
export function switchLang(lang: Lang): void {
  try {
    safeStorage()?.setItem(LANG_KEY, lang)
  } catch {
    /* private mode: the reload falls back to the browser language */
  }
  const url = new URL(location.href)
  url.searchParams.delete('lang')
  location.replace(url.href)
}
