// Device sync (B2) end-to-end against a local Supabase stack:
//   supabase start && supabase functions serve   (anonymous sign-ins on, see supabase/config.toml)
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_KEY=<local publishable key> npx vite --port 5179
//   node e2e/sync.mjs http://localhost:5179/
// Device A turns sync on and gets a Sync-Code; device B joins with it, receives A's beers and
// buddy number; a beer rated on B shows up on A. Then A resets its profile, which deletes the cloud
// account (B4): B switches its sync off by itself, keeps its beers, and the old code is dead.
import { chromium, devices } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5179/'
const out = process.argv[3] ?? '/tmp/sync'
const browser = await chromium.launch()
const errors = []
const device = async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 2, locale: 'de-DE' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  return { page, m: page.locator('main') }
}
const step = async (name, fn) => {
  try {
    await fn()
    console.log('ok  ', name)
  } catch (e) {
    console.log('FAIL', name, '-', String(e).split('\n')[0])
    await A.page.screenshot({ path: `${out}-a-fail.png` })
    await B.page.screenshot({ path: `${out}-b-fail.png` })
    await browser.close()
    process.exit(1)
  }
}

const A = await device()
const B = await device()
let code = ''
let buddyA = ''

await A.page.goto(`${base}?screen=profile&demo=1`, { waitUntil: 'load' })
await step('A: sync on → Sync-Code appears', async () => {
  await A.m.getByRole('switch', { name: /Geräte-Sync/ }).click()
  await A.m.getByTestId('sync-code').getByText(/^PILS(-[2-9A-HJ-NP-Z]{4}){4}$/).waitFor({ timeout: 15000 })
  code = (await A.m.getByTestId('sync-code').textContent()).trim()
  await A.m.getByText(/Synchron ·/).waitFor({ timeout: 10000 })
  buddyA = (await A.m.getByText(/Buddy #\d{4}/).first().textContent()).match(/#\d{4}/)[0]
})

await B.page.goto(`${base}?screen=profile`, { waitUntil: 'load' })
await step('B: wrong code is rejected', async () => {
  await B.m.getByRole('button', { name: /Sync-Code eingeben/ }).click()
  await B.m.getByRole('textbox', { name: 'Sync-Code eingeben' }).fill('PILS-2222-2222-2222-2222')
  await B.m.getByRole('button', { name: 'Verbinden' }).click()
  await B.m.getByText('Diesen Code kennen wir nicht').waitFor({ timeout: 10000 })
})
await step('B: joins with the code and gets A’s beers + buddy number', async () => {
  await B.m.getByRole('textbox', { name: 'Sync-Code eingeben' }).fill(code.toLowerCase())
  await B.m.getByRole('button', { name: 'Verbinden' }).click()
  await B.m.getByText('Jever Pilsener').waitFor({ timeout: 15000 })
  await B.m.getByText(buddyA).first().waitFor({ timeout: 5000 })
  await B.m.getByTestId('sync-code').getByText(code).waitFor({ timeout: 5000 })
})
await step('B rates a beer → A receives it', async () => {
  await B.page.getByRole('button', { name: 'Swipen' }).click()
  const name = await B.m.locator('[class*="slot"] h2, [class*="slot"] [class*="name"]').first().textContent()
  await B.page.keyboard.press('ArrowRight')
  await B.m.getByText(/übrig/).first().waitFor()
  await B.page.waitForTimeout(4000) // debounce + push
  await A.page.evaluate(() => window.dispatchEvent(new Event('online')))
  await A.m.getByText(name.trim().split(' ')[0]).first().waitFor({ timeout: 15000 })
})

await A.page.screenshot({ path: `${out}-a.png` })
await B.page.screenshot({ path: `${out}-b.png` })

await step('A: Profil zurücksetzen deletes the cloud account', async () => {
  A.page.once('dialog', (d) => d.accept())
  await A.m.getByRole('button', { name: /Profil zurücksetzen/ }).click()
  await A.m.getByRole('button', { name: "Los geht's" }).waitFor({ timeout: 15000 })
})
await step('B: notices, switches sync off, keeps its beers', async () => {
  await B.page.getByRole('button', { name: 'Profil', exact: true }).click()
  await B.page.evaluate(() => window.dispatchEvent(new Event('online')))
  await B.m.getByText(/auf einem anderen Gerät gelöscht/).waitFor({ timeout: 15000 })
  await B.m.getByRole('switch', { name: /Geräte-Sync/ }).and(B.m.locator('[aria-checked="false"]')).waitFor()
  await B.m.getByText('Jever Pilsener').waitFor()
  await B.page.screenshot({ path: `${out}-b-gone.png` })
})
await step('B: the old code is gone', async () => {
  await B.m.getByRole('button', { name: /Sync-Code eingeben/ }).click()
  await B.m.getByRole('textbox', { name: 'Sync-Code eingeben' }).fill(code)
  B.page.once('dialog', (d) => d.accept()) // „Bewertungen zusammenführen?“
  await B.m.getByRole('button', { name: 'Verbinden' }).click()
  await B.m.getByText('Diesen Code kennen wir nicht').waitFor({ timeout: 10000 })
})
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
