// Beer catalogue from the database (B3) end-to-end against a local Supabase stack:
//   psql "$DB_URL" -f e2e/catalog-seed.sql      (renames Jever to „Jever DB“, adds „Testbräu“)
//   VITE_SUPABASE_URL=… VITE_SUPABASE_KEY=… npx vite --port 5179 ; node e2e/catalog.mjs http://localhost:5179/
// First start: bundled JSON, rows are fetched in the background. Next start: the DB beers are there.
// Then the backend is unreachable: the cached catalogue still works.
import { chromium, devices } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5179/'
const out = process.argv[3] ?? '/tmp/catalog'
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 2 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const step = async (name, fn) => {
  try {
    await fn()
    console.log('ok  ', name)
  } catch (e) {
    console.log('FAIL', name, '-', String(e).split('\n')[0])
    await page.screenshot({ path: `${out}-fail.png` })
    await browser.close()
    process.exit(1)
  }
}

await page.goto(`${base}?screen=swipe`, { waitUntil: 'load' })
await step('first start: bundled beer, catalogue fetched in the background', async () => {
  await page.locator('main').getByText('Jever', { exact: true }).first().waitFor()
  await page.waitForFunction(() => localStorage.getItem('pilsbuddy.catalog')?.includes('db-testbier'), null, { timeout: 15000 })
})
await step('next start: the DB version of Jever is on the first card', async () => {
  await page.reload({ waitUntil: 'load' })
  await page.locator('main').getByText('Jever DB', { exact: true }).first().waitFor()
  await page.screenshot({ path: `${out}-card.png` })
})
await step('the new beer is in the catalogue (drawn bottle)', async () => {
  await page.goto(`${base}?gallery=bottles`, { waitUntil: 'load' })
  await page.getByText('db-testbier · abgeleitet').waitFor()
})
await step('backend unreachable: the cached catalogue still works', async () => {
  await ctx.route('**/rest/v1/**', (r) => r.abort())
  await page.goto(`${base}?screen=swipe`, { waitUntil: 'load' })
  await page.locator('main').getByText('Jever DB', { exact: true }).first().waitFor()
  await page.waitForTimeout(2500) // the background refresh fails quietly
})

console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
