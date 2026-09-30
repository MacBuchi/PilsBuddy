import { COPY, fill } from '../../data/copy'
import type { ShareCardData } from '../../domain/shareCard'
import { ACH_BY_ID, ACH_COLOR } from '../achievementIcons'
import { drawAvatar } from './drawAvatar'

export const CARD_W = 1080
export const CARD_H = 1350

const INK = '#1D1811'
const CREAM = '#F4ECDD'
const FOAM = '#FFF6E3'
const GOLD = '#F2B53A'
const GOLD_2 = '#F8CD6C'
const MUT = '#7A7163'
const DISPLAY = '"Bricolage Grotesque Variable", "Bricolage Grotesque", system-ui, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace'

const STICKER_EMOJI: Record<string, string> = {
  heart: '❤️',
  crown: '👑',
  binoculars: '🔭',
  'beer-stein': '🍺',
  'hand-waving': '👋',
  dna: '🧬',
  fire: '🔥',
  medal: '🏅',
  package: '📦',
  handshake: '🤝',
}

function lines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  let cur = ''
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && cur) {
      out.push(cur)
      cur = word
    } else cur = next
  }
  if (cur) out.push(cur)
  return out
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // letter-spacing for mono labels (ctx.letterSpacing is not everywhere yet)
  const chars = [...text]
  const total = chars.reduce((w, ch) => w + ctx.measureText(ch).width + spacing, -spacing)
  let cx = x - total / 2
  ctx.textAlign = 'left'
  for (const ch of chars) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + spacing
  }
}

/** Draws the 1080×1350 story card and resolves with a PNG blob. */
export async function renderShareCard(data: ShareCardData, url: string): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load(`800 100px ${DISPLAY}`),
      document.fonts.load(`600 40px ${DISPLAY}`),
      document.fonts.load(`700 30px ${MONO}`),
    ])
  } catch {
    /* fonts unavailable – system fallback is fine */
  }
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')

  // background + ink frame
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  ctx.lineWidth = 10
  ctx.strokeStyle = INK
  ctx.beginPath()
  ctx.roundRect(30, 30, CARD_W - 60, CARD_H - 60, 56)
  ctx.stroke()

  // kicker + persona
  ctx.fillStyle = MUT
  ctx.font = `700 28px ${MONO}`
  ctx.textBaseline = 'alphabetic'
  spaced(ctx, `${COPY.share.kicker} · ${fill(COPY.share.decoded, { pct: data.decoded })}`.toUpperCase(), CARD_W / 2, 118, 5)
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.font = `600 42px ${DISPLAY}`
  ctx.fillText(COPY.share.iAm, CARD_W / 2, 190)
  ctx.font = `800 96px ${DISPLAY}`
  const nameLines = lines(ctx, data.persona, CARD_W - 180)
  nameLines.forEach((l, i) => ctx.fillText(l, CARD_W / 2, 280 + i * 92))
  const afterName = 280 + (nameLines.length - 1) * 92

  // sunburst + avatar
  // two-line personas get a slightly smaller avatar so everything still fits
  const R = nameLines.length > 1 ? 160 : 190
  const cy = afterName + R + 50
  ctx.save()
  ctx.beginPath()
  ctx.arc(CARD_W / 2, cy, R, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = GOLD
  ctx.fillRect(CARD_W / 2 - R, cy - R, R * 2, R * 2)
  ctx.fillStyle = GOLD_2
  for (let i = 0; i < 20; i++) {
    const a0 = (i * Math.PI) / 10
    ctx.beginPath()
    ctx.moveTo(CARD_W / 2, cy)
    ctx.arc(CARD_W / 2, cy, R, a0, a0 + Math.PI / 20)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.lineWidth = 8
  ctx.strokeStyle = INK
  ctx.beginPath()
  ctx.arc(CARD_W / 2, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  const glyphs: Record<string, string> = {}
  const colors: Record<string, string> = {}
  for (const id of data.avatar.stickers) {
    const def = ACH_BY_ID[id]
    if (!def) continue
    glyphs[id] = STICKER_EMOJI[def.icon] ?? '★'
    colors[id] = ACH_COLOR[def.icon]
  }
  const size = R * 1.7
  drawAvatar(ctx, data.avatar, CARD_W / 2 - size / 2, cy - size * 0.515, size, glyphs, colors)

  // traits
  let y = cy + R + 60
  ctx.font = `700 26px ${MONO}`
  const chips = data.traits.map((t) => t.toUpperCase())
  const widths = chips.map((t) => ctx.measureText(t).width + 44)
  let x = CARD_W / 2 - (widths.reduce((a, b) => a + b, 0) + (chips.length - 1) * 14) / 2
  chips.forEach((t, i) => {
    ctx.beginPath()
    ctx.roundRect(x, y - 38, widths[i], 54, 27)
    ctx.fillStyle = FOAM
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.fillText(t, x + widths[i] / 2, y - 2)
    x += widths[i] + 14
  })

  // DNA bars
  y += 62
  for (const b of data.bars) {
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.font = `800 34px ${DISPLAY}`
    ctx.fillText(b.label, 110, y + 12)
    ctx.beginPath()
    ctx.roundRect(330, y - 16, 560, 34, 17)
    ctx.fillStyle = FOAM
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = b.color
    ctx.fillRect(330, y - 16, (560 * b.value) / 100, 34)
    ctx.restore()
    ctx.lineWidth = 4
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.textAlign = 'right'
    ctx.font = `700 28px ${MONO}`
    ctx.fillText(String(b.value), 970, y + 10)
    y += 54
  }

  // top beers
  y += 30
  ctx.textAlign = 'center'
  ctx.fillStyle = MUT
  ctx.font = `700 24px ${MONO}`
  spaced(ctx, data.topLabel.toUpperCase(), CARD_W / 2, y, 4)
  ctx.fillStyle = INK
  ctx.font = `800 38px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.fillText(data.top.map((t) => `${t.name} ${t.pct} %`).join('  ·  '), CARD_W / 2, y + 50, CARD_W - 160)

  // footer
  ctx.fillStyle = MUT
  ctx.font = `700 26px ${MONO}`
  ctx.fillText(`${COPY.share.footer} ${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}`, CARD_W / 2, CARD_H - 66)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'))
}

/** Share sheet with the image where supported (iOS/Android), otherwise download. */
export async function shareImage(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text })
    return 'shared'
  }
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 10_000)
  return 'downloaded'
}
