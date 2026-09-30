import type { AvatarSpec, Eyes, Mouth } from '../../domain/avatar'

/**
 * Canvas twin of <BuddyAvatar>: same 120×120 geometry, drawn with paths so the share card can be
 * exported as PNG on every browser (no DOM-to-image, no tainted canvas). Keep in sync visually.
 */

const INK = '#1D1811'
const FOAM = '#FFF6E3'
type Ctx = CanvasRenderingContext2D
type Radii = [number, number, number, number]

function radii(css: string): Radii {
  const n = css.split(/\s+/).map((v) => parseFloat(v) || 0)
  if (n.length === 1) return [n[0], n[0], n[0], n[0]]
  if (n.length === 2) return [n[0], n[1], n[0], n[1]]
  if (n.length === 3) return [n[0], n[1], n[2], n[1]]
  return [n[0], n[1], n[2], n[3]]
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | Radii) {
  const [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : r
  const c = (v: number) => Math.min(v, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + c(tl), y)
  ctx.lineTo(x + w - c(tr), y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + c(tr))
  ctx.lineTo(x + w, y + h - c(br))
  ctx.quadraticCurveTo(x + w, y + h, x + w - c(br), y + h)
  ctx.lineTo(x + c(bl), y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - c(bl))
  ctx.lineTo(x, y + c(tl))
  ctx.quadraticCurveTo(x, y, x + c(tl), y)
  ctx.closePath()
}

function circle(ctx: Ctx, cx: number, cy: number, r: number, fill: string, stroke?: string, lw = 2.5) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = lw
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | Radii, fill: string) {
  rr(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

/** Eye row: returns its height; draws centred on cx with the top at y. */
function eyes(ctx: Ctx, kind: Eyes, cx: number, y: number, eg: number, eg2: number): number {
  const ring = (x: number, s: number, pupil: number, h: number) => {
    const cy = y + h / 2
    circle(ctx, x + s / 2, cy, s / 2 - 1.25, FOAM, INK)
    circle(ctx, x + s / 2, cy, pupil / 2, INK)
  }
  switch (kind) {
    case 'Dot': {
      const w = 7 + eg + 7
      circle(ctx, cx - w / 2 + 3.5, y + 3.5, 3.5, INK)
      circle(ctx, cx + w / 2 - 3.5, y + 3.5, 3.5, INK)
      return 7
    }
    case 'Flat': {
      const w = 10 + eg + 10
      fillRR(ctx, cx - w / 2, y, 10, 4, 2, INK)
      fillRR(ctx, cx + w / 2 - 10, y, 10, 4, 2, INK)
      return 4
    }
    case 'Happy': {
      const w = 12 + eg + 12
      ctx.lineWidth = 3
      ctx.strokeStyle = INK
      for (const x of [cx - w / 2 + 6, cx + w / 2 - 6]) {
        ctx.beginPath()
        ctx.ellipse(x, y + 7, 4.5, 5.5, 0, Math.PI, 0)
        ctx.stroke()
      }
      return 7
    }
    case 'Wide': {
      const w = 14 + eg2 + 14
      ring(cx - w / 2, 14, 5, 14)
      ring(cx + w / 2 - 14, 14, 5, 14)
      return 14
    }
    case 'Shades': {
      const w = 19 + 3 + 4 + 3 + 19
      fillRR(ctx, cx - w / 2, y, 19, 11, [3, 3, 9, 9], INK)
      fillRR(ctx, cx - 2, y + 4, 4, 3, 0, INK)
      fillRR(ctx, cx + w / 2 - 19, y, 19, 11, [3, 3, 9, 9], INK)
      return 11
    }
    case 'Wink': {
      const w = 7 + eg + 11
      circle(ctx, cx - w / 2 + 3.5, y + 3.5, 3.5, INK)
      fillRR(ctx, cx + w / 2 - 11, y + 1.5, 11, 4, 2, INK)
      return 7
    }
    case 'Curious': {
      const w = 7 + eg2 + 15
      circle(ctx, cx - w / 2 + 3.5, y + 7.5, 3.5, INK)
      ring(cx + w / 2 - 15, 15, 6, 15)
      return 15
    }
    case 'Specs': {
      const w = 16 + 2 + 4 + 2 + 16
      ctx.lineWidth = 2.5
      ctx.strokeStyle = INK
      for (const x of [cx - w / 2 + 8, cx + w / 2 - 8]) {
        ctx.beginPath()
        ctx.arc(x, y + 8, 6.75, 0, Math.PI * 2)
        ctx.stroke()
        circle(ctx, x, y + 8, 2, INK)
      }
      fillRR(ctx, cx - 2, y + 6.75, 4, 2.5, 0, INK)
      return 16
    }
  }
}

function mouth(ctx: Ctx, kind: Mouth, cx: number, y: number): number {
  switch (kind) {
    case 'Smile':
      ctx.lineWidth = 3
      ctx.strokeStyle = INK
      ctx.beginPath()
      ctx.ellipse(cx, y, 6.5, 6.5, 0, 0, Math.PI)
      ctx.stroke()
      return 8
    case 'Line':
      fillRR(ctx, cx - 6, y, 12, 3, 1.5, INK)
      return 3
    case 'O':
      ctx.beginPath()
      ctx.ellipse(cx, y + 5, 4, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = INK
      ctx.fill()
      return 10
    case 'Grin':
      fillRR(ctx, cx - 9, y, 18, 9, [0, 0, 9, 9], INK)
      return 9
  }
}

/** Draws the avatar with its top-left at (x, y), `size` px square. Sticker glyphs are emoji, drawn as text. */
export function drawAvatar(
  ctx: Ctx,
  A: AvatarSpec,
  x: number,
  y: number,
  size: number,
  stickerGlyphs: Record<string, string> = {},
  stickerColors: Record<string, string> = {},
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 120, size / 120)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  const hidden = A.stage === 'hidden'
  const { width: w, height: h } = A
  const l = (120 - w) / 2 - (A.handle ? 7 : 0)
  const t = 108 - h
  const n = A.foamBumps
  const d = ((w + 4) / n) * 1.45 * (1 + 0.22 * (A.foam ?? 0))
  const bumps = Array.from({ length: n }, (_, i) => ({ x: l - 2 + ((w + 4) * (i + 0.5)) / n - d / 2, y: t - d * 0.55 }))
  const foamTop = t - d * 0.55
  const cx = l + w / 2
  const ft = t + h * (hidden ? 0.34 : 0.3)
  const eg = Math.max(8, Math.round(w * 0.2))
  const eg2 = Math.max(5, Math.round(w * 0.12))
  const acc = A.accessory
  const r = radii(A.radius)

  if (A.stage === 'stammgast') {
    ctx.beginPath()
    ctx.ellipse(cx, 111.5, (w + 34) / 2, 6.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = INK
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx, 108.5, (w + 34) / 2 - 1.25, 5.25, 0, 0, Math.PI * 2)
    ctx.fillStyle = FOAM
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = INK
    ctx.stroke()
  }
  if (A.handle) {
    rr(ctx, l + w - 3, t + 19, 20, 34, 11)
    ctx.lineWidth = 6
    ctx.strokeStyle = INK
    ctx.stroke()
  }
  // outline
  fillRR(ctx, l - 3, t - 3, w + 6, h + 6, r.map((v) => v + 2) as Radii, INK)
  for (const b of bumps) circle(ctx, b.x + d / 2, b.y + d / 2, d / 2 + 3, INK)
  // beer
  ctx.save()
  rr(ctx, l, t, w, h, r)
  ctx.fillStyle = A.beerColor
  ctx.fill()
  ctx.clip()
  fillRR(ctx, l + 6, t + 16, 6, Math.max(10, h - 34), 3, 'rgba(255,255,255,.42)')
  circle(ctx, l + w - 9 - 2.5, t + h - 13 - 2.5, 2.5, 'rgba(255,255,255,.6)')
  circle(ctx, l + w - 15 - 1.5, t + h - 24 - 1.5, 1.5, 'rgba(255,255,255,.6)')
  ctx.restore()
  // foam
  for (const b of bumps) circle(ctx, b.x + d / 2, b.y + d / 2, d / 2, FOAM)
  fillRR(ctx, l, t, w, 12, [6, 6, 0, 0], FOAM)

  if (hidden) {
    ctx.fillStyle = INK
    ctx.font = '800 34px "Bricolage Grotesque Variable", "Bricolage Grotesque", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('?', cx, ft)
  }

  if (acc === 'Hop') {
    ctx.save()
    ctx.translate(cx, foamTop - 3.5)
    ctx.rotate(Math.PI / 4)
    rr(ctx, -7.5, -7.5, 15, 15, [2, 9, 2, 9])
    ctx.fillStyle = '#6DBE5A'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.restore()
  }
  if (acc === 'Cap') {
    rr(ctx, l + w * 0.14, foamTop - 8, w * 0.72, 17, [16, 16, 3, 3])
    ctx.fillStyle = '#E5534B'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = INK
    ctx.stroke()
    fillRR(ctx, cx, foamTop + 5, w * 0.46, 5, 3, INK)
  }
  if (acc === 'Star') {
    for (const [sx, sy, s] of [
      [l + w + 5, t, 10],
      [l + w + 14, t + 16, 6],
    ] as const) {
      ctx.save()
      ctx.translate(sx + s / 2, sy + s / 2)
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle = '#FFD166'
      ctx.fillRect(-s / 2, -s / 2, s, s)
      ctx.lineWidth = 2
      ctx.strokeStyle = INK
      ctx.strokeRect(-s / 2, -s / 2, s, s)
      ctx.restore()
    }
  }

  if (!hidden) {
    let yy = ft
    if (acc === 'Brow') {
      for (const [dx, rot] of [
        [-9, 14],
        [9, -14],
      ] as const) {
        ctx.save()
        ctx.translate(cx + dx, yy + 2.25)
        ctx.rotate((rot * Math.PI) / 180)
        fillRR(ctx, -7, -2.25, 14, 4.5, 2.25, INK)
        ctx.restore()
      }
      yy += 4.5 + 5 - 2
    }
    yy += eyes(ctx, A.eyes, cx, yy, eg, eg2) + 5
    if (acc === 'Must') {
      yy -= 1
      for (const dx of [-7, 7]) {
        ctx.beginPath()
        ctx.ellipse(cx + dx, yy + 4.5, 7.25, 3.25, 0, 0, Math.PI * 2)
        ctx.fillStyle = FOAM
        ctx.fill()
        ctx.lineWidth = 2.5
        ctx.strokeStyle = INK
        ctx.stroke()
      }
      yy += 9 + 5
    }
    const mh = mouth(ctx, A.mouth, cx, yy)
    yy += mh + 5
    if (acc === 'Blush') {
      const gap = Math.round(w * 0.42)
      for (const dx of [-(gap / 2 + 4.5), gap / 2 + 4.5]) {
        ctx.beginPath()
        ctx.ellipse(cx + dx, yy - 12 + 2.5, 4.5, 2.5, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(229,83,75,.55)'
        ctx.fill()
      }
    }
    if (acc === 'Tie') {
      ctx.save()
      ctx.translate(cx + 1, yy + 1 + 4.5)
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle = '#E5534B'
      ctx.fillRect(-4.5, -4.5, 9, 9)
      ctx.lineWidth = 2
      ctx.strokeStyle = INK
      ctx.strokeRect(-4.5, -4.5, 9, 9)
      ctx.restore()
    }
  }

  A.stickers.forEach((id, i) => {
    const pos = i === 0 ? { x: l - 9, y: t + h - 30, r: -12 } : { x: l + w - 13, y: t + h - 22, r: 10 }
    ctx.save()
    ctx.translate(pos.x + 11, pos.y + 11)
    ctx.rotate((pos.r * Math.PI) / 180)
    circle(ctx, 0, 0, 10, stickerColors[id] ?? '#F2B53A', INK, 2)
    const glyph = stickerGlyphs[id]
    if (glyph) {
      ctx.font = '11px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(glyph, 0, 0.5)
    }
    ctx.restore()
  })

  ctx.restore()
}
