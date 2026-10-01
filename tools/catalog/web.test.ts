import { describe, expect, it } from 'vitest'
import { beerLinks, extractBeers, robotsAllows, textOf } from './web'

describe('robotsAllows', () => {
  it('follows the * group and our own group, wildcards included', () => {
    const robots = ['User-agent: *', 'Disallow: /intern/', 'Disallow: /*.pdf$', '', 'User-agent: GPTBot', 'Disallow: /'].join('\n')
    expect(robotsAllows(robots, '/biere/pils')).toBe(true)
    expect(robotsAllows(robots, '/intern/preise')).toBe(false)
    expect(robotsAllows(robots, '/flyer.pdf')).toBe(false)
    expect(robotsAllows('User-agent: PilsBuddyBot\nDisallow: /\n\nUser-agent: *\nDisallow:', '/biere')).toBe(false)
    expect(robotsAllows('User-agent: *\nDisallow: /', '/')).toBe(false)
    expect(robotsAllows(null, '/')).toBe(true)
    expect(robotsAllows('User-agent: *\nDisallow:', '/biere')).toBe(true)
  })
})

describe('beerLinks', () => {
  it('finds the beer overview on the same site and skips shop and legal pages', () => {
    const html = `
      <a href="/de/unsere-biere/">Unsere Biere</a>
      <a href="https://www.brauerei.de/sortiment">Sortiment</a>
      <a href="/shop/biere">Shop</a>
      <a href="/impressum">Impressum</a>
      <a href="https://facebook.com/biere">Biere</a>
      <a href="/geschichte">Geschichte</a>`
    expect(beerLinks(html, 'https://brauerei.de/')).toEqual(['https://www.brauerei.de/sortiment', 'https://brauerei.de/de/unsere-biere/'])
  })
})

describe('extractBeers', () => {
  it('takes headings with a beer style and the ABV below them', () => {
    const html = `
      <nav><h2>Unsere Biere</h2></nav>
      <h1>Unsere Biere</h1>
      <h3>Hoepfner Pilsner</h3><p>Feinherb. 4,9 % vol.</p>
      <h3>Hoepfner Hefeweizen <small>naturtrüb</small></h3><div>Alkohol: 5.2% vol</div>
      <h3>Rosébock</h3><p>Stark: 7,2 % Alc.</p>
      <h3>Geschichte</h3><p>Seit 1798 – 12 % mehr</p>
      <h3>Brauereiführung</h3>
      <h2>Zwischen Rhein &amp; Schwarzwald</h2>
      <h2>Schwarzbuebe Bier!</h2>`
    expect(extractBeers(html)).toEqual([
      { name: 'Hoepfner Pilsner', abv: 4.9 },
      { name: 'Hoepfner Hefeweizen naturtrüb', abv: 5.2 },
      { name: 'Rosébock', abv: 7.2 },
    ])
  })

  it('reads schema.org products from JSON-LD', () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Ureich Premium Pils","description":"<p>4,9 % vol</p>"},{"@type":"Organization","name":"Eichbaum"}]}</script>`
    expect(extractBeers(html)).toEqual([{ name: 'Ureich Premium Pils', abv: 4.9 }])
  })

  it('ignores names without a style and broken JSON', () => {
    expect(extractBeers('<script type="application/ld+json">{oops</script><h2>Sommerfest 2026</h2><h2>Kaufen Sie Pils</h2>')).toEqual([])
  })

  it('decodes entities', () => {
    expect(textOf('Wei&szlig;bier &amp; mehr')).toBe('Weißbier & mehr')
  })
})
