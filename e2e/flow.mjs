// End-to-end: fresh user → onboarding → swipes → DNA → avatar → match → detail → back → reload resumes.
import { chromium, devices } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5179/'
const out = process.argv[3] ?? '/tmp/flow'
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 2 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
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
const see = (t) => m.getByText(t, { exact: false }).first().waitFor({ timeout: 4000 })

await page.goto(base, { waitUntil: 'networkidle' })
await step('welcome', () => see('Erst Biere daten'))
await step('to howto', async () => { await m.getByText("Los geht's").click(); await see('Schritt 1 von 1') })
await step('age gate blocks', async () => { await m.getByText('Erstes Date starten').click(); await see('Kurz das Häkchen') })
await step('confirm age + start', async () => {
  await m.getByText('Ich bin mindestens 18').click()
  await m.getByText('Erstes Date starten').click()
  await see('Karte ziehen')
})
await step('tap opens detail and back', async () => {
  const card = m.locator('[class*="slot"]').first()
  await card.click()
  await see('Ihr im Vergleich')
  await m.getByLabel('Zurück').click()
  await see('übrig')
})
await step('6 swipes via keyboard + buttons', async () => {
  for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) { await page.keyboard.press(k); await page.waitForTimeout(450) }
  await m.getByLabel('Kenne ich', { exact: true }).click(); await page.waitForTimeout(450)
  await m.getByLabel('Mag ich', { exact: true }).click(); await page.waitForTimeout(450)
  await see('DNA auswerten')
  await see('36 übrig')
})
await step('analyze → dna', async () => {
  await m.getByText('DNA auswerten').click()
  await see('Bier-DNA wird sequenziert')
  await page.waitForTimeout(3300)
  await see('entschlüsselt')
  await see('Neugier-Faktor')
})
await step('dna → avatar', async () => { await m.getByText('Wer bin ich').click(); await see('Du bist') })
await step('avatar → match', async () => {
  await m.getByText('Mein Bier-Match zeigen').click()
  await see('Bier-Kompatibilität'); await page.waitForTimeout(1300)
  await page.screenshot({ path: `${out}-match.png` })
})
await step('match → detail → rate there', async () => {
  await m.getByText('Entdecken').click()
  await see('Wie steht ihr zueinander')
  await m.getByRole('button', { name: 'Will probieren' }).click()
  await see('Probierliste')
})
await step('back to match, weiterswipen shows tabs', async () => {
  await m.getByLabel('Zurück').click()
  await m.getByText('Weiterswipen').click()
  await see('Swipen'); await see('Profil')
})
await step('profile shows history + achievement', async () => {
  await m.getByText('Profil', { exact: true }).click()
  await see('Erstes Date'); await see('Jever Pilsener')
  await page.screenshot({ path: `${out}-profile.png` })
})
await step('reload resumes on deck with tabs', async () => {
  await page.reload({ waitUntil: 'networkidle' })
  await see('übrig'); await see('Swipen')
  await m.getByText('Bier-DNA', { exact: true }).click()
  await see('entschlüsselt')
})
await step('reset clears everything', async () => {
  await m.getByText('Profil', { exact: true }).click()
  page.once('dialog', (d) => d.accept())
  await m.getByText('Profil zurücksetzen').click()
  await see('Erst Biere daten')
  await page.reload({ waitUntil: 'networkidle' })
  await see('Erst Biere daten')
})
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'))
else console.log('no page errors')
await browser.close()
