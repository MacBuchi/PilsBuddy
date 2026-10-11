// Pils-Match (C2/C3) end-to-end against a local Supabase stack (see e2e/sync.mjs for the setup):
//   node e2e/match.mjs http://localhost:5179/
// Three devices become visible under Matches › Menschen. A name is unique regardless of case. B clinks A – A sees no
// hint of it until A clinks back, then both are buddies. C blocks A: they no longer see each other. B becomes
// invisible and drops out of A's feed.
import { chromium, devices } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5179/'
const out = process.argv[3] ?? '/tmp/match'
const browser = await chromium.launch()
const errors = []
const device = async (name) => {
  const ctx = await browser.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 2, locale: 'de-DE' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`))
  return { name, page, m: page.locator('main') }
}
const all = []
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

/** Matches › Menschen; switching tabs remounts the section, which loads the feed again. */
const people = async (d) => {
  await d.m.getByRole('tab', { name: /Biere/ }).click()
  await d.m.getByRole('tab', { name: /Menschen/ }).click()
}
const join = async (d, handle) => {
  await d.page.goto(`${base}?screen=matches&demo=1`, { waitUntil: 'load' })
  await people(d)
  await d.m.getByLabel('Dein Name bei Pils-Match').fill(handle)
  await d.m.getByRole('button', { name: 'Sichtbar werden' }).click()
}
const card = (d, handle) => d.m.locator('[class*="person"]').filter({ hasText: `@${handle}` }).first()

const A = await device('a')
const B = await device('b')
const C = await device('c')
all.push(A, B, C)

await step('A becomes visible as Hopfenhannes', async () => {
  await join(A, 'Hopfenhannes')
  await A.m.getByText('Du bist sichtbar als @Hopfenhannes').waitFor({ timeout: 20000 })
  await A.m.getByText(/Noch ist niemand sonst sichtbar/).waitFor()
})
await step('the name is unique regardless of case', async () => {
  await join(C, 'hopfenhannes')
  await C.m.getByText('Den Namen gibt es schon').waitFor({ timeout: 20000 })
  await C.m.getByLabel('Dein Name bei Pils-Match').fill('Craftcarla')
  await C.m.getByRole('button', { name: 'Sichtbar werden' }).click()
  await C.m.getByText('Du bist sichtbar als @Craftcarla').waitFor({ timeout: 20000 })
})
await step('B becomes visible and finds A and C with their match', async () => {
  await join(B, 'Malzmarie')
  await B.m.getByText('Du bist sichtbar als @Malzmarie').waitFor({ timeout: 20000 })
  await card(B, 'Hopfenhannes').getByText(/\d+ %/).waitFor({ timeout: 10000 })
  await card(B, 'Craftcarla').waitFor()
})
await step('B clinks A; A sees no hint of it yet', async () => {
  await card(B, 'Hopfenhannes').getByRole('button', { name: 'Anstoßen 🍻' }).click()
  await B.page.getByText(/Stößt Hopfenhannes zurück/).waitFor() // toast
  await card(B, 'Hopfenhannes').getByRole('button', { name: /Angestoßen/ }).waitFor()
  await people(A)
  await card(A, 'Malzmarie').getByRole('button', { name: 'Anstoßen 🍻' }).waitFor({ timeout: 10000 })
})
await step('A clinks back → both are buddies', async () => {
  await card(A, 'Malzmarie').getByRole('button', { name: 'Anstoßen 🍻' }).click()
  await A.m.getByText('Angestoßen – deine Buddys').waitFor({ timeout: 10000 })
  await card(A, 'Malzmarie').getByText('Buddys 🍻').waitFor()
  await people(B)
  await card(B, 'Hopfenhannes').getByText('Buddys 🍻').waitFor({ timeout: 10000 })
})
await step('the comparison opens with shared beers', async () => {
  await card(A, 'Malzmarie').getByRole('button', { name: /@Malzmarie/ }).click()
  await card(A, 'Malzmarie').getByText('Ihr mögt beide').waitFor()
  await A.page.screenshot({ path: `${out}-a.png` })
})
await step('C blocks A → they no longer see each other', async () => {
  await people(C)
  await card(C, 'Hopfenhannes').getByRole('button', { name: /@Hopfenhannes/ }).click()
  C.page.once('dialog', (d) => d.accept())
  await card(C, 'Hopfenhannes').getByRole('button', { name: 'Blockieren' }).click()
  await C.page.getByText('Hopfenhannes ist blockiert.').waitFor() // toast
  await people(C)
  await card(C, 'Malzmarie').waitFor({ timeout: 10000 })
  if (await card(C, 'Hopfenhannes').count()) throw new Error('C still sees A')
  await people(A)
  await card(A, 'Malzmarie').waitFor({ timeout: 10000 })
  if (await card(A, 'Craftcarla').count()) throw new Error('A still sees C')
})
await step('B becomes invisible → gone from A’s feed', async () => {
  B.page.once('dialog', (d) => d.accept())
  await B.m.getByRole('button', { name: 'Unsichtbar werden' }).click()
  await B.m.getByLabel('Dein Name bei Pils-Match').waitFor({ timeout: 10000 })
  await people(A)
  await A.m.getByText(/Noch ist niemand sonst sichtbar/).waitFor({ timeout: 10000 })
})

console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
