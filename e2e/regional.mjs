// Regional finder (R4) end-to-end against a local Supabase stack with the fixture catalogue imported
// (CI job „Backend E2E“; see e2e/catalog.mjs for the dev-server setup):
//   node e2e/regional.mjs http://localhost:5179/
// Position Mannheim → Eichbaum's beers ranked, brewery sheet, „Probieren“ → Probierliste survives a
// reload (snapshot). The request carries whole grid cells only. Offline: cached cells still work.
// Postcode 74906 (Bad Rappenau) → Brauerei Adler in Dettingen.
import { chromium, devices } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5179/'
const out = process.argv[3] ?? '/tmp/regional'
const browser = await chromium.launch()
const ctx = await browser.newContext({
  ...devices['iPhone 14'],
  deviceScaleFactor: 2,
  locale: 'de-DE', // the steps read German texts; English has its own step (I1)
  geolocation: { latitude: 49.4875, longitude: 8.4660 }, // Mannheim, Wasserturm
  permissions: ['geolocation'],
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const requests = []
page.on('request', (r) => r.url().includes('/rest/v1/') && requests.push(decodeURIComponent(r.url())))
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
const m = page.locator('main')
const see = (t, timeout = 8000) => m.getByText(t, { exact: false }).first().waitFor({ timeout })

await page.goto(`${base}?screen=dna&demo=1`, { waitUntil: 'load' })
await step('DNA → Biere aus deiner Nähe → position', async () => {
  await m.getByRole('button', { name: /Biere aus deiner Nähe/ }).click()
  await m.getByRole('button', { name: 'Mein Standort' }).click()
  await see('Dein Standort')
  await see('3 Biere · 1 Brauerei im Umkreis', 15000)
  await see('Ureich Premium Pils')
  await see('Stil-Schätzung')
  await page.screenshot({ path: `${out}-list.png` })
})
await step('only whole grid cells were asked for, never the position', async () => {
  const brew = requests.filter((u) => u.includes('/rest/v1/breweries'))
  if (!brew.length) throw new Error('no breweries request')
  for (const u of brew) {
    if (u.includes('49.4875') || u.includes('8.466')) throw new Error('position leaked: ' + u)
    if (!u.includes('lat.gte.49.5,lat.lt.50') && !u.includes('lat.gte.49,lat.lt.49.5')) throw new Error('not a cell query: ' + u)
  }
})
await step('radius 100 km reaches Brauerei Adler (Dettingen)', async () => {
  await m.getByRole('radio', { name: '100 km' }).click()
  await see('Adler Hell', 15000)
})
await step('brewery sheet: facts, route, Probieren', async () => {
  await m.getByRole('button', { name: /Ureich Premium Pils/ }).click()
  await see('Hauptbiere')
  await see('seit 1679')
  const route = await m.getByRole('link', { name: /Route/ }).getAttribute('href')
  if (!route?.includes('destination=49.49540,8.48230')) throw new Error('route link: ' + route)
  await m.getByRole('button', { name: 'Probieren', exact: true }).first().click()
  await m.getByRole('button', { name: 'Vorgemerkt', exact: true }).first().waitFor()
  await page.screenshot({ path: `${out}-sheet.png` })
})
await step('detail of a regional beer: estimate + source', async () => {
  await m.locator('[role=dialog]').getByText('Eichbaum Export').click()
  await see('Ihr im Vergleich')
  await see('Quelle: Open Food Facts')
  await see('Privatbrauerei Eichbaum')
  await page.screenshot({ path: `${out}-detail.png` })
  await m.getByLabel('Zurück').click()
  await see('Biere aus deiner Nähe')
})
await step('touched regional beers are kept as snapshots on the device', async () => {
  await page.goto(`${base}?screen=matches`, { waitUntil: 'load' })
  await m.getByRole('tab', { name: 'Probierliste' }).click()
  // dev `?screen=` starts without the stored profile – so check the snapshot directly
  const snap = await page.evaluate(() => localStorage.getItem('pilsbuddy.regional.beers') ?? '')
  if (!snap.includes('Ureich Premium Pils') || !snap.includes('Eichbaum Export')) throw new Error('no snapshot: ' + snap)
})
await step('offline: cached cells still answer, an unknown postcode explains itself', async () => {
  await ctx.route('**/rest/v1/**', (r) => r.abort())
  await m.getByRole('tab', { name: 'Nähe' }).click()
  await m.getByRole('button', { name: 'Mein Standort' }).click()
  await see('Ureich Premium Pils', 15000)
  await m.getByLabel('PLZ').fill('74906')
  await m.getByRole('button', { name: 'Los' }).click()
  await see('Ohne Verbindung')
  await ctx.unroute('**/rest/v1/**')
})
await step('postcode 74906 → Brauerei Adler nearby', async () => {
  await m.getByRole('button', { name: 'Los' }).click()
  await see('Rund um 74906 Bad Rappenau', 15000)
  await m.getByRole('radio', { name: '25 km' }).click()
  await see('Adler Hell', 15000)
  await page.screenshot({ path: `${out}-plz.png` })
})

await step('world map: all breweries, no position sent, a glass opens the brewery sheet', async () => {
  requests.length = 0
  await m.getByRole('button', { name: 'Weltkarte aller Brauereien' }).click()
  await see('Brauerei-Weltkarte')
  await m.getByText(/^\d[\d.]* Brauereien?$/).first().waitFor({ timeout: 15000 })
  const list = requests.filter((u) => u.includes('select=id,name,lat,lon,country&'))
  if (!list.length) throw new Error('no map request')
  for (const u of list) if (/lat\.|lon\.|49\.2|9\.1/.test(u.split('?')[1].replace(/select=[^&]*/, ''))) throw new Error('position in map request: ' + u)
  // the map starts around the stored postcode (74906); zoom into a cluster if Adler shares one
  const adler = m.getByRole('button', { name: /Adler/ })
  for (let i = 0; i < 4 && !(await adler.count()); i++) {
    await m.getByRole('button', { name: /näher heran/ }).first().click()
    await page.waitForTimeout(600)
  }
  await page.screenshot({ path: `${out}-map.png` })
  await adler.first().click()
  await m.locator('[role=dialog]').getByText('Adler Hell').waitFor({ timeout: 15000 })
  await page.screenshot({ path: `${out}-map-sheet.png` })
  await page.keyboard.press('Escape')
  await m.getByLabel('Zurück').click()
  await m.getByRole('tab', { name: 'Nähe' }).waitFor()
})

console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
