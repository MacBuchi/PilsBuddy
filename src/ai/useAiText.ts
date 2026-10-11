import { useEffect, useSyncExternalStore } from 'react'
import { useApp } from '../state/AppContext'
import { aiKey } from './prompt'
import type { AiRequest } from './prompt'
import { aiProvider } from './provider'
import type { AiProvider } from './provider'

/**
 * The only way into the AI layer (Stufe D1). Returns `off` while the user has not switched „KI-Texte“ on – the
 * screens then show just their deterministic texts. Answers are kept for the session, so a screen asks once.
 */
export type AiText = { state: 'off' | 'pending' | 'none' } | { state: 'ok'; text: string }

const answers = new Map<string, AiText>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

const PENDING: AiText = { state: 'pending' }
const OFF: AiText = { state: 'off' }

/** Ask once per request and session; failures become `none` (the deterministic texts stay). */
export function requestAiText(provider: AiProvider, req: AiRequest): void {
  const key = `${provider.name}:${aiKey(req)}`
  if (answers.has(key)) return
  answers.set(key, PENDING)
  provider.generate(req).then(
    (text) => answers.set(key, text ? { state: 'ok', text } : { state: 'none' }),
    () => answers.delete(key), // offline or broken: try again next time the screen opens
  ).finally(notify)
}

export function forgetAiTexts(): void {
  answers.clear()
  notify()
}

export function useAiText(req: AiRequest | null): AiText {
  const { state } = useApp()
  const provider = aiProvider(state.profile.ai)
  const key = req && provider.name !== 'disabled' ? `${provider.name}:${aiKey(req)}` : null
  useEffect(() => {
    if (key && req) requestAiText(provider, req)
    // the key covers the request and the provider
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return useSyncExternalStore(subscribe, () => (key ? (answers.get(key) ?? PENDING) : OFF))
}
