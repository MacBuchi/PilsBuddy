/** Stable, non-cryptographic hash of an id – picks quips, palettes and timings deterministically. */
export function hashId(id: string): number {
  let h = 7
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}
