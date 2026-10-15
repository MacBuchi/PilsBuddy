import { describe, expect, it } from 'vitest'
import { pdfItems } from './pdf'
import { extractPdfBeers, pdfBlocks } from './web'

/** A one-page PDF with text lines at (x, y) in Helvetica 12 pt – enough for pdf.js. */
function makePdf(lines: [number, number, string][]): Uint8Array {
  const stream = lines.map(([x, y, t]) => `BT /F1 12 Tf ${x} ${y} Td (${t}) Tj ET`).join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}

describe('pdfItems', () => {
  it('reads a drinks list into beers', async () => {
    const pages = await pdfItems(
      makePdf([
        [50, 800, 'Getraenkekarte'],
        [50, 760, 'Kellerpils'],
        [300, 760, '4,9 % vol'],
        [450, 760, '0,5 l 4,20 EUR'],
        [50, 740, 'Dunkler Bock'],
        [300, 740, '6,8 % vol'],
        [50, 720, 'Apfelschorle'],
        [450, 720, '3,10 EUR'],
      ]),
    )
    const blocks = pdfBlocks(pages)
    expect(blocks).toContain('Kellerpils')
    expect(extractPdfBeers(blocks)).toEqual([
      { name: 'Kellerpils', abv: 4.9 },
      { name: 'Dunkler Bock', abv: 6.8 },
    ])
  })

  it('throws on a file that is no PDF', async () => {
    await expect(pdfItems(new TextEncoder().encode('<html>404</html>'))).rejects.toThrow()
  })
})
