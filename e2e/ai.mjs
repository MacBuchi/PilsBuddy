// KI-Texte (Stufe D) against the dev server, /api/ai mocked (the worker has its own unit tests, worker/index.test.ts):
//   node e2e/ai.mjs http://localhost:5179/
// Off by default: no request at all. Switched on in the profile: the avatar gets a roast and the beer detail an
// AI line, from requests that carry no ratings. A refused request (limit reached) leaves only the fixed texts.
import { chromium, devices } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5179/'
const out = process.argv[3] ?? '/tmp/ai'
const browser = await chromium.launch()
const errors = []
const sent = []

async function device(answer) {
  const ctx = await browser.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 2, locale: 'de-DE' })
  await ctx.route('**/api/ai', async (route) => {
    const body = route.request().postDataJSON()
    sent.push(body)
    if (answer === 429) return route.fulfill({ status: 429, json: { error: 'limit' } })
    return route.fulfill({ json: { text: body.kind === 'roast' ? 'E2E-Roast: Du Hopfenheld trinkst bitter wie dein Montag.' : 'E2E-Warum: Das passt wie Deckel auf Flasche.' } })
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  return page
}

let page
const step = async (name, fn) => {
  try {
    await fn()
    console.log('ok  ', name)
  } catch (e) {
    console.log('FAIL', name, '-', String(e).split('\n')[0])
    await page?.screenshot({ path: `${out}-fail.png` })
    await browser.close()
    process.exit(1)
  }
}
const m = () => page.locator('main')
/** Profile › „KI-Texte“ on, then DNA › avatar through the app (a `?screen=` reload would start a fresh profile). */
const switchOnAndOpenAvatar = async () => {
  await page.goto(`${base}?screen=profile&demo=1`, { waitUntil: 'load' })
  const toggle = m().getByRole('switch', { name: /KI-Texte/ })
  await toggle.click()
  if ((await toggle.getAttribute('aria-checked')) !== 'true') throw new Error('switch did not turn on')
  await page.getByRole('navigation').getByRole('button', { name: /Bier-DNA/ }).click()
  await m().getByRole('button', { name: /Wer bin ich eigentlich/ }).click()
}

page = await device()
await step('off by default: the avatar shows its own text and asks nobody', async () => {
  await page.goto(`${base}?screen=avatar&demo=1`, { waitUntil: 'load' })
  await m().getByText('Du bist …').waitFor()
  await page.waitForTimeout(800)
  if (await m().getByText('KI-Roast').count()) throw new Error('AI box without opt-in')
  if (sent.length) throw new Error(`sent ${sent.length} request(s) without opt-in`)
})
await step('switched on: the avatar gets a roast', async () => {
  await switchOnAndOpenAvatar()
  await m().getByText('KI-Roast').waitFor({ timeout: 10000 })
  await m().getByText(/E2E-Roast: Du Hopfenheld/).waitFor({ timeout: 10000 })
  const roast = sent.find((b) => b.kind === 'roast')
  if (!roast?.persona || 'ratings' in roast || Object.values(roast.taste).some((v) => v % 5)) throw new Error(`odd request ${JSON.stringify(roast)}`)
  await page.waitForTimeout(800) // entry animations
  await page.screenshot({ path: `${out}-avatar.png` })
})
await step('the beer detail adds an AI line under „Warum passt es zu dir?“', async () => {
  await m().getByRole('button', { name: 'Mein Bier-Match zeigen' }).click()
  await m().getByRole('button', { name: 'Entdecken' }).click()
  await m().getByText('Die KI meint').waitFor({ timeout: 10000 })
  await m().getByText(/E2E-Warum/).waitFor({ timeout: 10000 })
  const why = sent.find((b) => b.kind === 'why')
  if (!why?.beer || !why.style || typeof why.pct !== 'number') throw new Error(`odd request ${JSON.stringify(why)}`)
  await m().getByText('Die KI meint').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}-detail.png` })
})

page = await device(429)
await step('limit reached: only the fixed texts stay', async () => {
  const before = sent.length
  await switchOnAndOpenAvatar()
  await m().getByText('Du bist …').waitFor()
  for (let i = 0; i < 50 && sent.length === before; i++) await page.waitForTimeout(100)
  if (sent.length === before) throw new Error('no request after opting in')
  await m().getByText('KI-Roast').waitFor({ state: 'detached', timeout: 10000 })
})

console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
