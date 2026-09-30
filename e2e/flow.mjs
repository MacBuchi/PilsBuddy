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

await page.goto(base, { waitUntil: 'load' })
await step('welcome', () => see('Erst Biere daten'))
await step('to howto', async () => { await m.getByText("Los geht's").click(); await see('Schritt 1 von 1') })
await step('age gate blocks', async () => { await m.getByText('Erstes Date starten').click(); await see('Kurz das Häkchen') })
await step('confirm age + start', async () => {
  await m.getByText('Ich bin mindestens 18').click()
  await m.getByText('Erstes Date starten').click()
  await see('Karte ziehen')
})
await step('help sheet opens and closes', async () => {
  await m.getByLabel('Wie war das nochmal?').click()
  await see('So swipst du')
  await m.getByText('Verstanden').click()
  await m.getByText('So swipst du').waitFor({ state: 'detached', timeout: 2000 })
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
  await see('54 übrig')
})
await step('undo via button and Backspace', async () => {
  await m.getByLabel('Zurückholen').click()
  await see('Zurückgeholt'); await see('55 übrig')
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(450)
  await see('54 übrig')
  await page.keyboard.press('Backspace'); await page.waitForTimeout(450)
  await see('55 übrig')
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(450)
  await see('54 übrig')
})
await step('analyze → dna', async () => {
  await m.getByText('DNA auswerten').click()
  await see('Bier-DNA wird sequenziert')
  await page.waitForTimeout(3300)
  await see('entschlüsselt')
  await see('Neugier-Faktor')
})
await step('dna → avatar', async () => { await m.getByText('Wer bin ich').click(); await see('Du bist') })
await step('share card downloads as PNG', async () => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), m.getByLabel('Als Bild teilen').click()])
  if (!dl.suggestedFilename().endsWith('.png')) throw new Error('unexpected file ' + dl.suggestedFilename())
  await dl.saveAs(`${out}-sharecard.png`)
})
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
  await m.getByText('Zurückholen').click()
  await see('Zurückgeholt')
  await m.getByRole('button', { name: 'Will probieren' }).click()
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
await step('probierliste: tried → verdict removes it', async () => {
  await m.getByText('Matches', { exact: true }).click()
  await m.getByRole('tab', { name: 'Probierliste' }).click()
  await see('Vorgemerkt')
  const before = await m.getByRole('button', { name: 'Probiert!' }).count()
  if (before < 1) throw new Error('empty Probierliste')
  await m.getByRole('button', { name: 'Probiert!' }).first().click()
  await see("Und? Wie war's?")
  await page.screenshot({ path: `${out}-ratesheet.png` })
  await m.getByRole('button', { name: /Mag ich/ }).click()
  await m.getByText("Und? Wie war's?").waitFor({ state: 'detached', timeout: 2000 })
  const after = await m.getByRole('button', { name: 'Probiert!' }).count()
  if (after !== before - 1) throw new Error(`expected ${before - 1} left, got ${after}`)
})
await step('swipe header shows next match chip → detail', async () => {
  await m.getByText('Swipen', { exact: true }).click()
  await m.getByLabel(/Nächstes Match/).click()
  await see('Ihr im Vergleich')
  await m.getByLabel('Zurück').click()
})
await step('reload resumes on deck with tabs', async () => {
  await page.reload({ waitUntil: 'load' })
  await see('übrig'); await see('Swipen')
  await m.getByText('Bier-DNA', { exact: true }).click()
  await see('entschlüsselt')
})
await step('export → reset → import on welcome restores the profile', async () => {
  await m.getByText('Profil', { exact: true }).click()
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), m.getByText('Profil exportieren').click()])
  const file = `${out}-profile.json`
  await dl.saveAs(file)
  page.once('dialog', (d) => d.accept())
  await m.getByText('Profil zurücksetzen').click()
  await see('Erst Biere daten')
  await m.getByLabel('Profil importieren').setInputFiles(file)
  await see('Willkommen zurück')
  await see('übrig')
  await m.getByText('Profil', { exact: true }).click()
  await see('Jever Pilsener')
})
await step('reset clears everything', async () => {
  await m.getByText('Profil', { exact: true }).click()
  page.once('dialog', (d) => d.accept())
  await m.getByText('Profil zurücksetzen').click()
  await see('Erst Biere daten')
  await page.reload({ waitUntil: 'load' })
  await see('Erst Biere daten')
})
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'))
else console.log('no page errors')
await browser.close()
