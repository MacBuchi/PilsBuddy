/** Sync-Code format: PILS-XXXX-XXXX-XXXX-XXXX from a 32-letter alphabet without 0/O/1/I. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

/** Accepts what people type (lowercase, spaces, missing dashes or prefix); null if it can't be a code. */
export function normalizeCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^PILS/, '')
  if (raw.length !== 16 || [...raw].some((c) => !ALPHABET.includes(c))) return null
  return `PILS-${raw.match(/.{4}/g)!.join('-')}`
}
