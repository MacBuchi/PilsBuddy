// V9d: pages built by JavaScript, rendered in headless Chromium. Playwright is no project dependency – the CI action
// .github/actions/playwright installs it into PW_DIR (/tmp/pw); without it the crawler simply skips this step.
// Honest and light: own User-Agent, no images/media/fonts, no embedded tap-list services (Untappd's terms), no
// tricks against bot shields – a challenge page just gives no beers.
import { createRequire } from 'node:module'
import { CRAWLER_UA } from './web'

/** Hosts of embedded tap lists – never loaded, so their menus never end up in the catalogue. */
export const WIDGET_HOSTS = /(^|\.)(untappd\.com|utfb\.com|taplist\.io|beermenus\.com|digitalpour\.com|ekos\.app|orchestratedbeer\.com)$/i

interface PwRoute {
  request(): { url(): string; resourceType(): string }
  abort(): Promise<void>
  continue(): Promise<void>
}
interface PwPage {
  route(pattern: string, handler: (route: PwRoute) => Promise<void>): Promise<void>
  goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<{ status(): number } | null>
  waitForLoadState(state: string, opts: { timeout: number }): Promise<void>
  waitForTimeout(ms: number): Promise<void>
  content(): Promise<string>
  url(): string
}
interface PwContext {
  newPage(): Promise<PwPage>
  close(): Promise<void>
}
interface PwBrowser {
  newContext(opts: { userAgent: string; locale: string; javaScriptEnabled: boolean }): Promise<PwContext>
  close(): Promise<void>
}

export interface Rendered {
  url: string
  status: number
  html: string
}

/** The rendered page HTML, or null when it did not load. */
export type Render = (url: string, locale: string) => Promise<Rendered | null>

/** Starts Chromium from PW_DIR; null when Playwright is not installed there. */
export async function openBrowser(dir = process.env.PW_DIR): Promise<{ render: Render; close: () => Promise<void> } | null> {
  if (!dir) return null
  let chromium: { launch(opts: { headless: boolean }): Promise<PwBrowser> }
  try {
    chromium = createRequire(`${dir.replace(/\/$/, '')}/`)('playwright').chromium
  } catch {
    return null
  }
  const browser = await chromium.launch({ headless: true })
  const render: Render = async (url, locale) => {
    const context = await browser.newContext({ userAgent: CRAWLER_UA, locale, javaScriptEnabled: true })
    try {
      const page = await context.newPage()
      await page.route('**/*', async (route) => {
        const req = route.request()
        let host = ''
        try {
          host = new URL(req.url()).hostname
        } catch {
          // data: and blob: URLs
        }
        if (['image', 'media', 'font'].includes(req.resourceType()) || WIDGET_HOSTS.test(host)) await route.abort()
        else await route.continue()
      })
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => null)
      if (!res) return null
      // most sites settle within seconds; chatty ones (polling, analytics) get the page as it is by then
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined)
      await page.waitForTimeout(500)
      return { url: page.url(), status: res.status(), html: (await page.content()).slice(0, 2_000_000) }
    } catch {
      return null
    } finally {
      await context.close()
    }
  }
  return { render, close: () => browser.close() }
}
