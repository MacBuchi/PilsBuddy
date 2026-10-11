import { AI_MAX_TOKENS, buildPrompt, cleanAiText } from './prompt'
import type { AiRequest } from './prompt'

/**
 * Where AI texts come from (Stufe D1). `disabled` is the default: the app shows only its deterministic texts and
 * sends nothing. `cloud` (the user switched „KI-Texte“ on) asks our worker at /api/ai (Cloudflare Workers AI, D2).
 * `ollama` is for development: `VITE_AI_PROVIDER=ollama npm run dev` talks to a local Ollama instead.
 * Components never call this – they use `useAiText()`.
 */

export type AiProviderName = 'disabled' | 'ollama' | 'cloud'

export interface AiProvider {
  name: AiProviderName
  /** The text, or null when the provider has none to give (off, limit reached, unusable answer). Throws offline. */
  generate: (req: AiRequest, signal?: AbortSignal) => Promise<string | null>
}

const disabled: AiProvider = { name: 'disabled', generate: async () => null }

const cloud: AiProvider = {
  name: 'cloud',
  generate: async (req, signal) => {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
    // 429 = the daily budget or the per-device limit is used up: the deterministic texts stay
    if (!res.ok) return null
    const data = (await res.json().catch(() => null)) as { text?: unknown } | null
    return cleanAiText(data?.text)
  },
}

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'llama3.2'

const ollama: AiProvider = {
  name: 'ollama',
  generate: async (req, signal) => {
    const { system, user } = buildPrompt(req)
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({ model: OLLAMA_MODEL, system, prompt: user, stream: false, options: { num_predict: AI_MAX_TOKENS } }),
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json().catch(() => null)) as { response?: unknown } | null
    return cleanAiText(data?.response)
  },
}

/** The provider for this device: nothing unless the user opted in. */
export function aiProvider(optIn: boolean, configured: string | undefined = import.meta.env.VITE_AI_PROVIDER): AiProvider {
  if (!optIn || configured === 'disabled') return disabled
  return configured === 'ollama' ? ollama : cloud
}
