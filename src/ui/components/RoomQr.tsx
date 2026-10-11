import { useEffect, useState } from 'react'

/**
 * QR code for a room invite. The encoder loads only when a room is open; until then (or offline
 * without it) the code below the QR is enough to join.
 */
export function RoomQr({ text, label, className }: { text: string; label: string; className?: string }) {
  const [qr, setQr] = useState<{ text: string; size: number; path: string } | null>(null)

  useEffect(() => {
    let live = true
    import('qrcode-generator')
      .then(({ default: qrcode }) => {
        const code = qrcode(0, 'M')
        code.addData(text)
        code.make()
        const n = code.getModuleCount()
        let path = ''
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (code.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`
        if (live) setQr({ text, size: n, path })
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [text])

  if (!qr || qr.text !== text) return <div className={className} aria-hidden />
  const quiet = 2
  const box = qr.size + quiet * 2
  return (
    <svg className={className} viewBox={`${-quiet} ${-quiet} ${box} ${box}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect x={-quiet} y={-quiet} width={box} height={box} fill="#fff" />
      <path d={qr.path} fill="#000" />
    </svg>
  )
}
