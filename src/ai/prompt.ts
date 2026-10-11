import { TASTE_AXES } from '../domain/types'
import type { TasteVector } from '../domain/types'

/**
 * The optional AI layer (Stufe D) – what may be asked and how. Shared by the app (Ollama in development) and the
 * worker behind /api/ai, which accepts nothing but these two requests: no free prompts, so the endpoint is no
 * general-purpose chatbot. Only the persona name and taste values travel – never ratings, ids or the buddy number.
 * DNA, matching, persona and avatar stay AI-free; these texts are an extra on top of the deterministic ones.
 */

export type AiLang = 'de' | 'en'

export type AiRequest =
  | { kind: 'roast'; lang: AiLang; persona: string; taste: TasteVector }
  | { kind: 'why'; lang: AiLang; beer: string; style: string; beerTaste: TasteVector; taste: TasteVector; pct: number }

export interface AiPrompt {
  system: string
  user: string
}

/** Longest text the UI shows; the model is asked for less. */
export const AI_MAX_CHARS = 420
export const AI_MAX_TOKENS = 130

/** Persona, beer and style names: one line, no quotes or brackets that could pass for prompt structure. */
const NAME = /^[^\p{C}"„“”«»<>{}[\]\\]{1,60}$/u

const name = (v: unknown): string | null => (typeof v === 'string' && NAME.test(v.trim()) ? v.trim() : null)
const pct = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100 ? v : null)

function taste(v: unknown): TasteVector | null {
  if (!v || typeof v !== 'object') return null
  const out = {} as TasteVector
  for (const axis of TASTE_AXES) {
    const n = pct((v as Record<string, unknown>)[axis])
    if (n === null) return null
    out[axis] = n
  }
  return out
}

/** Round to steps of 5: answers repeat for similar tastes (cache hits) and the values say less about a person. */
export function coarse(t: TasteVector): TasteVector {
  const out = {} as TasteVector
  for (const axis of TASTE_AXES) out[axis] = Math.min(100, Math.max(0, Math.round(t[axis] / 5) * 5))
  return out
}

/** Whatever arrived over the wire → a valid request, or null. */
export function parseAiRequest(raw: unknown): AiRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const lang = r.lang === 'de' || r.lang === 'en' ? r.lang : null
  const mine = taste(r.taste)
  if (!lang || !mine) return null
  if (r.kind === 'roast') {
    const persona = name(r.persona)
    return persona ? { kind: 'roast', lang, persona, taste: mine } : null
  }
  if (r.kind === 'why') {
    const beer = name(r.beer)
    const style = name(r.style)
    const beerTaste = taste(r.beerTaste)
    const p = pct(r.pct)
    return beer && style && beerTaste && p !== null ? { kind: 'why', lang, beer, style, beerTaste, taste: mine, pct: p } : null
  }
  return null
}

/** Stable key of a request – same question, same cached answer (parsing rebuilds it in a fixed key order). */
export const aiKey = (req: AiRequest): string => JSON.stringify(parseAiRequest(req))

const AXIS: Record<AiLang, Record<keyof TasteVector, string>> = {
  de: {
    bitterness: 'Bitterkeit',
    hopIntensity: 'Hopfen',
    maltiness: 'Malz',
    sweetness: 'Süße',
    dryness: 'Trockenheit',
    body: 'Körper',
    drinkability: 'Süffigkeit',
    character: 'Charakter',
  },
  en: {
    bitterness: 'bitterness',
    hopIntensity: 'hops',
    maltiness: 'malt',
    sweetness: 'sweetness',
    dryness: 'dryness',
    body: 'body',
    drinkability: 'drinkability',
    character: 'character',
  },
}

/** Bumped whenever the prompt or the model changes, so cached answers of the old one are not served again. */
export const PROMPT_VERSION = 2

/**
 * Taste in words instead of numbers: small models parrot numbers and mix up scales, but they handle „sehr bitter,
 * kaum süß“ well. Only what stands out is named – the middle of the scale says nothing.
 */
const LEVEL: Record<AiLang, [high: string, low: string]> = { de: ['viel', 'wenig'], en: ['lots of', 'little'] }

export function tasteWords(lang: AiLang, t: TasteVector): string {
  const [high, low] = LEVEL[lang]
  const strong = TASTE_AXES.filter((a) => t[a] >= 65).sort((a, b) => t[b] - t[a])
  const weak = TASTE_AXES.filter((a) => t[a] <= 30).sort((a, b) => t[a] - t[b])
  const parts = [
    ...strong.slice(0, 3).map((a) => `${high} ${AXIS[lang][a]}`),
    ...weak.slice(0, 2).map((a) => `${low} ${AXIS[lang][a]}`),
  ]
  return parts.length ? parts.join(', ') : lang === 'de' ? 'alles schön in der Mitte' : 'everything nicely in the middle'
}

const SYSTEM: Record<AiLang, string> = {
  de:
    'Du bist PilsBuddy, ein frecher, herzlicher Kumpel am Tresen. Du sprichst die Person direkt mit „du“ an, nie in der ' +
    'dritten Person. Schreib natürliches, umgangssprachliches Deutsch: höchstens drei kurze Sätze, höchstens ein Emoji, ' +
    'keine Aufzählung, keine Anführungszeichen, keine Zahlen, keine Einleitung wie „Hier ist“. Nie beleidigend, nichts über ' +
    'Aussehen, Herkunft, Gesundheit oder Alkoholmengen, kein Aufruf zum Trinken.',
  en:
    'You are PilsBuddy, a cheeky, warm mate at the bar. Talk to the person directly as "you", never in the third person. ' +
    'Write natural, casual English: at most three short sentences, at most one emoji, no lists, no quotation marks, no ' +
    'numbers, no preamble like "Here is". Never insulting, nothing about looks, origin, health or amounts of alcohol, never ' +
    'urge anyone to drink.',
}

export function buildPrompt(req: AiRequest): AiPrompt {
  const { lang } = req
  const mine = tasteWords(lang, req.taste)
  if (req.kind === 'roast') {
    return {
      system: SYSTEM[lang],
      user:
        lang === 'de'
          ? `Meine Bier-Persona heißt ${req.persona}. Beim Bier mag ich ${mine}. Zieh mich damit liebevoll auf – sprich mich mit du an.`
          : `My beer persona is called ${req.persona}. In a beer I like ${mine}. Tease me about it lovingly – talk to me as you.`,
    }
  }
  const verdict =
    req.pct >= 75
      ? lang === 'de' ? 'passt sehr gut zu mir' : 'suits me very well'
      : req.pct >= 50
        ? lang === 'de' ? 'passt so halb zu mir' : 'half suits me'
        : lang === 'de' ? 'passt eher nicht zu mir' : 'rather does not suit me'
  return {
    system: SYSTEM[lang],
    user:
      lang === 'de'
        ? `Das Bier ${req.beer} (${req.style}) hat ${tasteWords(lang, req.beerTaste)}. Ich mag ${mine}. Laut PilsBuddy ${verdict}. ` +
          'Erklär mir in zwei Sätzen, woran das liegt – sprich mich mit du an.'
        : `The beer ${req.beer} (${req.style}) has ${tasteWords(lang, req.beerTaste)}. I like ${mine}. PilsBuddy says it ${verdict}. ` +
          'Explain to me in two sentences why – talk to me as you.',
  }
}

/** Model output → what the UI shows: plain text, one paragraph, bounded; null if nothing usable is left. */
export function cleanAiText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let t = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(PilsBuddy|Antwort|Answer)\s*:\s*/i, '')
    .replace(/^["„“”'\s]+|["„“”'\s]+$/g, '')
    .trim()
  if (t.length > AI_MAX_CHARS) {
    const cut = t.slice(0, AI_MAX_CHARS)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    t = end > 80 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`
  }
  return t.length >= 10 ? t : null
}
