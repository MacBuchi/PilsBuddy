/** Ink on light beers, foam on dark beers (Stout, Schwarzbier …). */
export function textOnBeer(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.45 ? '#1D1811' : '#FFF6E3'
}

export function isDarkBeer(hex: string): boolean {
  return textOnBeer(hex) !== '#1D1811'
}
