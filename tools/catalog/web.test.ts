import { describe, expect, it } from 'vitest'
import { beerLinks, beerName, cleanName, extractBeers, robotsAllows, textOf } from './web'

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
      <a href="/geschichte">Geschichte</a>
      <a href="/%E0%A4%A/biere">kaputt</a>`
    expect(beerLinks(html, 'https://brauerei.de/')).toEqual(['https://www.brauerei.de/sortiment', 'https://brauerei.de/de/unsere-biere/', 'https://brauerei.de/%E0%A4%A/biere'])
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

  it('drops sentences, events, rooms and news', () => {
    const heads = [
      'Brauhauskeller',
      'Gärung und Lagerung',
      'Lager\u00adverkauf',
      'Bockbierfest 2026',
      'Oktoberfest im Wirtshaus',
      'Schwarzbier ist nicht gleich Schwarzbier',
      'Erstes alkoholfreies Weißbier der Welt',
      'Andechser Apfelweisse alkoholfrei offiziell vorgestellt',
      'Unser Biergarten',
      'Weißbierglas 0,3L',
      'Alkoholfreie Alternativen',
      'Bitte alkoholfrei genießen.',
      'hopfenblumiges, feinherbes, untergäriges Vollbier',
      'Lagermitarbeiter (w/m/d)',
      'Domhof Bockbierbrand',
      'Wiener Schnitzel',
      'Gator Events',
      'Durstgenerator',
      'Gastronomie in Bamberg',
      'Festbier Steckbrief',
      'Biersiphon Pils oder Weizen naturtrüb',
      'HOP SWISS Hoppy Lager 24x33cl',
    ]
    expect(extractBeers(heads.map((h) => `<h2>${h}</h2>`).join(''))).toEqual([])
    expect(extractBeers('<h2>Festbier</h2><h2>Kellerbier</h2>').map((b) => b.name)).toEqual(['Festbier', 'Kellerbier'])
  })

  it('tidies names', () => {
    expect(cleanName('„Dunkler Doppelbock“ – im Rumfass veredelt')).toBe('Dunkler Doppelbock')
    expect(cleanName('Easy Rider – Alkoholfreies, BIO')).toBe('Easy Rider – Alkoholfreies, BIO')
    expect(cleanName('UR-KROSTITZER SCHWARZBIER')).toBe('UR-Krostitzer Schwarzbier')
    expect(cleanName('HADERNER WEIßBIER')).toBe('Haderner Weißbier')
    expect(cleanName('INDIA PALE ALE')).toBe('India Pale Ale')
    expect(cleanName('BRLO IPA')).toBe('Brlo IPA')
    expect(cleanName('Lindenbräu&#x27;s Herbstbock')).toBe("Lindenbräu's Herbstbock")
    expect(cleanName('Jetzt neu: Distel Helles Lager')).toBe('Distel Helles Lager')
    expect(cleanName('Urhell – Kellerpils (SOLD OUT)')).toBe('Urhell – Kellerpils')
    expect(cleanName('Pils: unser Klassiker')).toBe('Pils: unser Klassiker')
    expect(cleanName('renegade ipa')).toBe('Renegade IPA')
    expect(cleanName('Kel\u00adler Pils')).toBe('Keller Pils')
    // menu leftovers on English sites
    expect(cleanName('Hazy West Coast IPA |')).toBe('Hazy West Coast IPA')
    expect(cleanName('Lucky Cat Rice Lager //')).toBe('Lucky Cat Rice Lager')
    expect(cleanName('(Hoppy Lager )')).toBe('Hoppy Lager')
    expect(cleanName('Cackler IPA ( IPA')).toBe('Cackler IPA')
    expect(cleanName('Mustache Ride ( Red Ale')).toBe('Mustache Ride Red Ale')
    expect(cleanName('Hazy IPA ABV:')).toBe('Hazy IPA')
    expect(cleanName('Juicy IPA, ABV')).toBe('Juicy IPA')
    expect(cleanName('Night Hike Porter (Porter)')).toBe('Night Hike Porter')
    expect(cleanName('River Runner ESB (Extra Special Bitter)')).toBe('River Runner ESB')
    expect(cleanName('Green Eyed Lady (Belgian Strong Ale)')).toBe('Green Eyed Lady (Belgian Strong Ale)')
    expect(cleanName('Porter 4.6 ABV • 28 IBU')).toBe('Porter')
    expect(cleanName('Blootylicious – Blueberry Wheat Ale |')).toBe('Blootylicious – Blueberry Wheat Ale')
    expect(cleanName('DEVIL’S STAIRCASE IPA')).toBe('Devil’s Staircase IPA')
    expect(cleanName("Wiley's Blood Orange Wheat")).toBe("Wiley's Blood Orange Wheat")
  })

  it('takes the ABV out of the name', () => {
    expect(beerName('West Coast IPA 6.4% ABV')).toEqual({ name: 'West Coast IPA', abv: 6.4 })
    expect(beerName('Märzen (5,6 % vol.)', 5.8)).toEqual({ name: 'Märzen', abv: 5.8 })
    expect(beerName('Sommerfest')).toBeNull()
  })

  it('reads English brewery pages with their own filters', () => {
    const html = `
      <h1>Our Beers</h1>
      <h2>60 Minute IPA</h2><p>6.0% ABV · 60 IBU</p>
      <h2>Son of a Peach Wheat Ale</h2><p>ABV: 5.2%</p>
      <h2>Old Rasputin Russian Imperial Stout</h2>
      <h3>Bigfoot Barley Wine</h3><p>9.6% abv</p>
      <h2>Join us for Oktoberfest 2026</h2>
      <h2>IPA Growler Fills</h2>
      <h2>Hard Seltzer Lager</h2>
      <h2>Rosé Wine Sour</h2>
      <h2>Shop all Pale Ale merch</h2>
      <h2>Lager 6-pack 12 oz cans</h2>
      <h2>Our IPA is back!</h2>`
    expect(extractBeers(html, 'en')).toEqual([
      { name: '60 Minute IPA', abv: 6 },
      { name: 'Son of a Peach Wheat Ale', abv: 5.2 },
      { name: 'Old Rasputin Russian Imperial Stout', abv: null },
      { name: 'Bigfoot Barley Wine', abv: 9.6 },
    ])
    // the German profile still drops what it dropped before
    expect(beerName('Son of a Peach Wheat Ale')).toBeNull()
    expect(beerName('All Day IPA', null, 'en')).toEqual({ name: 'All Day IPA', abv: null })
    for (const event of [
      'IPA Series',
      'Oktoberfest NEW RELEASE',
      'Friday 10/2 English bitter',
      'IPA and Craft Beer Trends',
      'Oktoberfest Party',
      'House-made Ginger Ale',
      'Ales & Lagers, Friends & Neighbors',
    ])
      expect(beerName(event, null, 'en')).toBeNull()
    expect(beerName('Party On IPA', null, 'en')).toEqual({ name: 'Party On IPA', abv: null })
    expect(beerName('Celebration Fresh Hop IPA', null, 'en')).toEqual({ name: 'Celebration Fresh Hop IPA', abv: null })
    expect(beerName('Root Beer Porter', null, 'en')).toEqual({ name: 'Root Beer Porter', abv: null })
    expect(beerName('Fly By Night IPA', null, 'en')).toEqual({ name: 'Fly By Night IPA', abv: null })
  })

  it('finds English beer pages', () => {
    const html = `<a href="/our-beers">Our Beers</a><a href="/on-tap">On Tap</a><a href="/store">Beer Store</a><a href="/careers">Careers</a>`
    expect(beerLinks(html, 'https://brewery.com/')).toEqual(['https://brewery.com/on-tap', 'https://brewery.com/our-beers'])
  })

  it('decodes entities', () => {
    expect(textOf('Wei&szlig;bier &amp; mehr')).toBe('Weißbier & mehr')
  })
})
