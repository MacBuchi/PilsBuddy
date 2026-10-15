import { describe, expect, it } from 'vitest'
import { diagnoseSite, diagnosisReport, pageSignals, styleNames, wantsBrowser } from './diagnose'
import type { Fetched, SiteRow } from './diagnose'

const page = (html: string, url = 'https://brauerei.de/'): Fetched => ({ url, status: 200, html })
const site = (home: Fetched | null, pages: Fetched[] = [], beers = 0) => diagnoseSite('https://brauerei.de', { robotsAllowed: true, home, pages, beers })
const filler = '<p>' + 'Seit 1890 brauen wir mit Liebe in unserem kleinen Ort. '.repeat(12) + '</p>'

describe('pageSignals', () => {
  it('recognises builders, widgets, PDFs and product data', () => {
    const s = pageSignals(
      `<html><link href="https://static1.squarespace.com/x.css"><div class="embed-menu-preloader"></div>
       <a href="/files/Getraenkekarte.pdf">Karte</a>
       <script type="application/ld+json">{"@type": "Product", "name": "Pils"}</script>${filler}</html>`,
      'https://brauerei.de/',
    )
    expect(s).toMatchObject({ builder: 'squarespace', widget: 'untappd', pdf: true, jsonLd: true, js: false })
  })

  it('calls a page with an empty app root or nearly only script JavaScript-built', () => {
    expect(pageSignals('<body><div id="root"></div><script src="/app.js"></script></body>', 'https://a.de/').js).toBe(true)
    expect(pageSignals(`<body><h1>Brauerei</h1><script>${'x'.repeat(5000)}</script></body>`, 'https://a.de/').js).toBe(true)
    expect(pageSignals(`<body>${filler}<script>${'x'.repeat(5000)}</script></body>`, 'https://a.de/').js).toBe(false)
  })
})

describe('styleNames', () => {
  it('counts short style-naming texts in any element, not in nav or long sentences', () => {
    const html = `<nav><a>Pils</a></nav><div class="t">Kellerbier</div><span>Hazy IPA</span><strong>Kellerbier</strong>
      <p>Unser Pils ist das beste Bier weit und breit in der ganzen Region, sagen alle.</p>`
    expect(styleNames(html)).toBe(2)
  })
})

describe('diagnoseSite', () => {
  it('names network and HTTP failures', () => {
    expect(diagnoseSite('https://brauerei.de', { robotsAllowed: false, home: null, pages: [], beers: 0 }).reason).toBe('robots')
    expect(site({ url: 'https://brauerei.de/', status: 0, html: '', error: 'dns' })).toMatchObject({ reason: 'offline', error: 'dns' })
    expect(site({ url: 'https://brauerei.de/', status: 403, html: '' }).reason).toBe('blocked')
    expect(site({ url: 'https://brauerei.de/', status: 404, html: '' }).reason).toBe('http-error')
    expect(site({ url: 'https://brauerei.de/', status: 200, html: '', type: 'application/pdf' }).reason).toBe('not-html')
  })

  it('names websites that are social profiles, also after a redirect', () => {
    expect(diagnoseSite('https://www.facebook.com', { robotsAllowed: true, home: page(filler, 'https://www.facebook.com/brauerei'), pages: [], beers: 0 }).reason).toBe('offsite')
    expect(site(page(filler, 'https://linktr.ee/brauerei'))).toMatchObject({ reason: 'offsite', finalHost: 'linktr.ee' })
  })

  it('separates found beers, widgets, JavaScript, PDFs, missing beer pages and missed names', () => {
    expect(site(page(`${filler}<h2>Pils</h2>`), [], 1).reason).toBe('beers')
    expect(site(page(`${filler}<iframe src="https://taplist.io/x"></iframe>`)).reason).toBe('widget')
    expect(site(page('<div id="root"></div>')).reason).toBe('js')
    expect(site(page(`${filler}<a href="/bierkarte.pdf">Bierkarte</a>`)).reason).toBe('pdf')
    expect(site(page(filler)).reason).toBe('no-beer-page')
    expect(site(page(filler), [{ url: 'https://brauerei.de/biere', status: 403, html: '' }])).toMatchObject({ reason: 'page-failed', links: 1 })
    const viaSitemap = diagnoseSite('https://brauerei.de', { robotsAllowed: true, home: page(filler), pages: [], beers: 0, links: 2, sitemap: true })
    expect(viaSitemap).toMatchObject({ reason: 'page-failed', sitemap: true })
    const viaPdf = diagnoseSite('https://brauerei.de', { robotsAllowed: true, home: page(filler), pages: [], beers: 3, pdfBeers: 3 })
    expect(viaPdf).toMatchObject({ reason: 'beers', fromPdf: true })
    const missed = site(page(filler), [page(`${filler}<div class="name">Kellerbier</div>`, 'https://brauerei.de/biere')])
    expect(missed).toMatchObject({ reason: 'missed', beerPages: 1, styleNames: 1 })
    expect(site(page(filler), [page(filler, 'https://brauerei.de/biere')])).toMatchObject({ reason: 'unnamed', beerPages: 1 })
    expect(site(page(`${filler}<b>Kellerbier</b>`)).reason).toBe('missed')
  })

  it('renders only JavaScript pages without a tap-list widget', () => {
    const app = page('<div id="root"></div><script src="/app.js"></script>')
    expect(wantsBrowser([app])).toBe(true)
    expect(wantsBrowser([page(filler)])).toBe(false)
    expect(wantsBrowser([app, page(`${filler}<script src="https://embed-menu-preloader.untappdapi.com/x.js"></script>`)])).toBe(false)
    expect(wantsBrowser([{ url: 'https://brauerei.de/', html: '' }])).toBe(false)
  })

  it('keeps the final host only when the site moved to another domain', () => {
    expect(site(page(filler, 'https://www.brauerei.de/start')).finalHost).toBeNull()
    expect(site(page(filler, 'https://neue-brauerei.de/')).finalHost).toBe('neue-brauerei.de')
  })
})

describe('diagnosisReport', () => {
  it('tables the reasons per country and lists examples', () => {
    const row = (origin: string, country: string, reason: SiteRow['reason'], extra: Partial<SiteRow> = {}): SiteRow => ({
      origin,
      country,
      reason,
      status: 200,
      error: null,
      finalHost: null,
      builder: null,
      widget: null,
      beerPages: 0,
      links: 0,
      sitemap: false,
      fromPdf: false,
      rendered: false,
      styleNames: 0,
      jsonLd: false,
      ...extra,
    })
    const report = diagnosisReport([
      row('https://a.de', 'DE', 'beers'),
      row('https://b.de', 'DE', 'js', { builder: 'wix' }),
      row('https://c.com', 'US', 'js', { builder: 'wix' }),
      row('https://d.com', 'US', 'offline', { error: 'dns', status: 0 }),
      row('https://e.de', 'DE', 'beers', { fromPdf: true }),
      row('https://f.de', 'DE', 'pdf'),
      row('https://g.com', 'US', 'beers', { rendered: true }),
    ])
    expect(report).toContain('7 Websites · mit Bieren 3 (43 %)')
    expect(report).toContain('| js | 1 | 1 | 2 | 29 % |')
    expect(report).toContain('im Browser gerendert: 1 Websites, davon mit Bier 1')
    expect(report).toContain('PDF-Getränkekarten: 2 Websites, davon mit Bier 1')
    expect(report).toContain('Baukasten: wix 2')
    expect(report).toContain('**Nicht erreichbar:** dns 1')
    expect(report).toContain('- **js**: b.de · c.com')
  })
})
