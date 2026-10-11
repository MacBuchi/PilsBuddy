// Game room (E4) end-to-end against a local Supabase stack with Realtime:
//   supabase start   (realtime must run – it is not excluded in the CI job „Backend E2E“)
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_KEY=<local publishable key> npx vite --port 5179
//   node e2e/room.mjs http://localhost:5179/
// A opens a room; B comes in through the invite link (new user: age first), C types the code.
// The host holds the state: toasting only once every guest is ready, everyone sees „Prost!“, the host
// brings them back. All three play „Wie viel ist drin?“ (E5); C leaves, A and B start Quartett zu zweit.
// Then A closes the room and B is told. An unknown code is not found.
import { chromium, devices } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5179/'
const out = process.argv[3] ?? '/tmp/room'
const browser = await chromium.launch()
const errors = []
const all = []
const device = async (name) => {
  const ctx = await browser.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 2, locale: 'de-DE' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${name}: ${String(e)}`))
  const d = { name, page, m: page.locator('main') }
  all.push(d)
  return d
}
const step = async (name, fn) => {
  try {
    await fn()
    console.log('ok  ', name)
  } catch (e) {
    console.log('FAIL', name, '-', String(e).split('\n')[0])
    for (const d of all) await d.page.screenshot({ path: `${out}-${d.name}-fail.png` })
    await browser.close()
    process.exit(1)
  }
}
const players = (d, n) => d.m.getByText(`Am Tisch · ${n}/8`).first().waitFor({ timeout: 15000 })

const A = await device('a')
const B = await device('b')
const C = await device('c')
let code = ''

await A.page.goto(`${base}?screen=games&demo=1`, { waitUntil: 'load' })
await step('A: opens a room → code + QR', async () => {
  await A.m.getByRole('button', { name: /Spielraum/ }).click()
  await A.m.getByRole('button', { name: 'Raum öffnen' }).click()
  await A.m.getByTestId('room-code').waitFor({ timeout: 15000 })
  code = (await A.m.getByTestId('room-code').textContent()).trim()
  if (!/^[2-9A-HJKMNP-Z]{5}$/.test(code)) throw new Error(`odd code ${code}`)
  await A.m.getByRole('img', { name: `QR-Code für Raum ${code}` }).waitFor({ timeout: 10000 })
  await players(A, 1)
  await A.m.getByText('Noch allein am Tisch').waitFor()
})

await step('B: invite link → age → joins', async () => {
  await B.page.goto(`${base}?room=${code.toLowerCase()}`, { waitUntil: 'load' })
  await B.m.getByRole('button', { name: 'Ich bin mindestens 18 Jahre alt.' }).click()
  await players(B, 2)
  await players(A, 2)
  if (new URL(B.page.url()).searchParams.has('room')) throw new Error('room param left in the address bar')
})

await step('C: types the code', async () => {
  await C.page.goto(`${base}?screen=games&demo=1`, { waitUntil: 'load' })
  await C.m.getByRole('button', { name: /Spielraum/ }).click()
  await C.m.getByRole('textbox', { name: 'Raum-Code' }).fill(`${code.slice(0, 3)}-${code.slice(3).toLowerCase()}`)
  await C.m.getByRole('button', { name: 'Beitreten' }).click()
  await players(C, 3)
  await players(A, 3)
  await players(B, 3)
})

await step('host can toast only when every guest is ready', async () => {
  const cheers = A.m.getByRole('button', { name: /Anstoßen/ })
  if (!(await cheers.isDisabled())) throw new Error('toast enabled before everyone is ready')
  await B.m.getByRole('button', { name: 'Ich bin bereit' }).click()
  await A.m.getByText('bereit', { exact: true }).nth(1).waitFor({ timeout: 10000 }) // host + B
  if (!(await cheers.isDisabled())) throw new Error('toast enabled with C not ready')
  await C.m.getByRole('button', { name: 'Ich bin bereit' }).click()
  await A.page.waitForFunction(() => {
    const b = [...document.querySelectorAll('main button')].find((x) => x.textContent?.includes('Anstoßen'))
    return b && !b.disabled
  }, null, { timeout: 10000 })
  await A.page.screenshot({ path: `${out}-a-lobby.png` })
  await B.page.screenshot({ path: `${out}-b-lobby.png` })
})

await step('everyone sees „Prost!“; the host brings them back', async () => {
  await A.m.getByRole('button', { name: /Anstoßen/ }).click()
  for (const d of [A, B, C]) await d.m.getByRole('heading', { name: 'Prost!' }).waitFor({ timeout: 10000 })
  await B.m.getByText('Runde 1 – alle 3 haben gleichzeitig angestoßen.').waitFor()
  await B.page.screenshot({ path: `${out}-b-prost.png` })
  await A.m.getByRole('button', { name: 'Zurück an den Tisch' }).click()
  await B.m.getByRole('button', { name: 'Ich bin bereit' }).waitFor({ timeout: 10000 })
})

const guessAll = async (devices) => {
  for (const d of devices) await d.m.getByRole('button', { name: 'Schätzen', exact: true }).click()
}

await step('„Wie viel ist drin?“ for all three: guess, reveal, result', async () => {
  for (const d of [B, C]) await d.m.getByRole('button', { name: 'Ich bin bereit' }).click()
  const start = A.m.getByRole('button', { name: '„Wie viel ist drin?“ für alle' })
  await A.page.waitForFunction(() => {
    const b = [...document.querySelectorAll('main button')].find((x) => x.textContent?.includes('für alle'))
    return b && !b.disabled
  }, null, { timeout: 10000 })
  if (!(await A.m.getByRole('button', { name: 'Quartett zu zweit' }).isDisabled())) throw new Error('Quartett open for three')
  await start.click()
  for (const d of [A, B, C]) await d.m.getByText('Glas 1 von 5').waitFor({ timeout: 10000 })
  // glass 1: C dawdles, the host resolves without them
  await guessAll([A, B])
  await A.m.getByText('2 von 3 haben geschätzt').waitFor({ timeout: 10000 })
  await A.m.getByRole('button', { name: 'Auflösen' }).click()
  for (const d of [A, B, C]) await d.m.getByText(/^Drin waren \d+ ml\.$/).waitFor({ timeout: 10000 })
  await C.m.getByText('nicht geschätzt').waitFor()
  await B.page.screenshot({ path: `${out}-b-fill-reveal.png` })
  // glasses 2–5: everyone guesses → resolves by itself
  for (let n = 2; n <= 5; n++) {
    await A.m.getByRole('button', { name: n === 2 ? 'Nächstes Glas' : /Nächstes Glas|Zur Auswertung/ }).click()
    for (const d of [A, B, C]) await d.m.getByText(`Glas ${n} von 5`).waitFor({ timeout: 10000 })
    await guessAll([A, B, C])
    for (const d of [A, B, C]) await d.m.getByText(/^Drin waren \d+ ml\.$/).waitFor({ timeout: 10000 })
  }
  await A.m.getByRole('button', { name: 'Zur Auswertung' }).click()
  for (const d of [A, B, C]) await d.m.getByText('Auswertung', { exact: true }).waitFor({ timeout: 10000 })
  await C.page.screenshot({ path: `${out}-c-fill-result.png` })
  await A.m.getByRole('button', { name: 'Zurück an den Tisch' }).click()
  await B.m.getByRole('button', { name: 'Ich bin bereit' }).waitFor({ timeout: 10000 })
})

await step('C leaves → A sees two at the table', async () => {
  await C.m.getByRole('button', { name: 'Raum verlassen' }).click()
  await C.m.getByRole('heading', { name: 'Spiele' }).waitFor()
  await players(A, 2)
})

await step('Quartett zu zweit: the host names a value, both see the round', async () => {
  await B.m.getByRole('button', { name: 'Ich bin bereit' }).click()
  await A.page.waitForFunction(() => {
    const b = [...document.querySelectorAll('main button')].find((x) => x.textContent?.includes('Quartett zu zweit'))
    return b && !b.disabled
  }, null, { timeout: 10000 })
  await A.m.getByRole('button', { name: 'Quartett zu zweit' }).click()
  await A.m.getByText('Du bist dran – tipp deinen stärksten Wert.').waitFor({ timeout: 10000 })
  await B.m.getByText(/ überlegt …$/).waitFor({ timeout: 10000 })
  if (!(await B.m.getByRole('button', { name: /^Alkohol / }).isDisabled())) throw new Error('B may pick out of turn')
  await A.m.getByRole('button', { name: /^Alkohol / }).click()
  await A.m.getByText(/^Du sagst: Alkohol!/).waitFor({ timeout: 10000 })
  await B.m.getByText(/ sagt: Alkohol!/).waitFor({ timeout: 10000 })
  await B.page.screenshot({ path: `${out}-b-duel.png` })
  for (const d of [A, B]) await d.m.getByRole('button', { name: 'Weiter' }).click()
  A.page.once('dialog', (d) => d.accept())
  await A.m.getByRole('button', { name: 'Spiel abbrechen' }).click()
  await B.m.getByRole('button', { name: 'Ich bin bereit' }).waitFor({ timeout: 10000 })
})

await step('A closes the room → B is told', async () => {
  A.page.once('dialog', (d) => d.accept())
  await A.m.getByRole('button', { name: 'Raum verlassen' }).click()
  await B.m.getByText('Der Gastgeber hat den Raum geschlossen.').waitFor({ timeout: 15000 })
  await B.page.screenshot({ path: `${out}-b-gone.png` })
})

await step('B: an unknown room is not found', async () => {
  await B.m.getByRole('button', { name: 'Anderer Raum' }).click()
  const unknown = code === 'ZZZZZ' ? 'YYYYY' : 'ZZZZZ'
  await B.m.getByRole('textbox', { name: 'Raum-Code' }).fill('K7Q2O')
  await B.m.getByRole('button', { name: 'Beitreten' }).click()
  await B.m.getByText(/fünf Zeichen/).waitFor()
  await B.m.getByRole('textbox', { name: 'Raum-Code' }).fill(unknown)
  await B.m.getByRole('button', { name: 'Beitreten' }).click()
  await B.m.getByText(`Raum ${unknown} gibt es gerade nicht.`, { exact: false }).waitFor({ timeout: 15000 })
})

console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
