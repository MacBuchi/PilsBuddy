// V9c: the text pieces of a PDF drinks list, for pdfBlocks in web.ts. pdf.js via unpdf (Node build, no worker).
import { getDocumentProxy } from 'unpdf'
import type { PdfItem } from './web'

/** Text pieces of the first `maxPages` pages; throws on a broken or encrypted file. */
export async function pdfItems(bytes: Uint8Array, maxPages = 6): Promise<PdfItem[][]> {
  const doc = await getDocumentProxy(bytes, { verbosity: 0 })
  try {
    const pages: PdfItem[][] = []
    for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
      const content = await (await doc.getPage(n)).getTextContent()
      pages.push(
        content.items.flatMap((i) =>
          'str' in i ? [{ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: Math.abs(i.transform[3]) || i.height }] : [],
        ),
      )
    }
    return pages
  } finally {
    await doc.cleanup()
  }
}
