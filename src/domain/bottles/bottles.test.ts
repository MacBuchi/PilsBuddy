import { describe, expect, it } from 'vitest'
import raw from '../../data/beers.json'
import type { Beer } from '../types'
import { bottleDesign, designFor, styleRule } from './design'
import { MOTIFS } from './motifs'
import { parsePack } from './pack'
import { escapeXml, renderBottle, textWidth } from './render'
import { sanitizeDesign } from './sanitize'
import { bodyPath, SHAPES } from './shapes'
import type { BottleDesign } from './types'

const beers = raw as unknown as Beer[]
const byId = (id: string) => beers.find((b) => b.id === id)!
const draw = (beer: Beer, extra: Partial<Parameters<typeof renderBottle>[0]> = {}) =>
  renderBottle({ design: bottleDesign(beer), beer: beer.color, abv: '4,9 %', seed: 42, uid: beer.id, ...extra })

describe('shapes', () => {
  // outlines of the hand-designed bottles – the templates must reproduce them exactly
  it.each([
    ['euro', 'M185 1188Q155 1188 155 1158L155 538C155 396.6 244 406.7 244 336L244 216L356 216L356 336C356 406.7 445 396.6 445 538L445 1158Q445 1188 415 1188Z'],
    ['steinie', 'M196 1188Q154 1188 154 1146L154 734C154 558.25 253 613.75 253 549L253 454L347 454L347 549C347 613.75 446 558.25 446 734L446 1146Q446 1188 404 1188Z'],
    ['longneck', 'M192 1188Q164 1188 164 1160L164 593C164 463.75 252 440.25 252 358L252 102L348 102L348 358C348 440.25 436 463.75 436 593L436 1160Q436 1188 408 1188Z'],
    ['longneck33', 'M203 1188Q177 1188 177 1162L177 656C177 540.5 256 519.5 256 446L256 221L344 221L344 446C344 519.5 423 540.5 423 656L423 1162Q423 1188 397 1188Z'],
    ['nrw', 'M186 1188Q158 1188 158 1160L158 616C158 486.15 250 374.85 250 245L250 102L350 102L350 245C350 374.85 442 486.15 442 616L442 1160Q442 1188 414 1188Z'],
    ['vichy33', 'M208 1188Q182 1188 182 1162L182 670C182 586.6 257 489.3 257 392L257 265L343 265L343 392C343 489.3 418 586.6 418 670L418 1162Q418 1188 392 1188Z'],
  ] as const)('%s matches the designed outline', (key, d) => {
    expect(bodyPath(SHAPES[key])).toBe(d)
  })

  it('swing top, Weißbier neck and waist are variants of the same outline', () => {
    expect(bodyPath(SHAPES.euro, { swing: true })).toContain('L244 232L356 232')
    expect(bodyPath(SHAPES.longneck, { bulge: true })).toContain('C252 232 243 227 243 202')
    expect(bodyPath(SHAPES.longneck, { waist: true })).toContain('Q180 890.5 164 593')
  })
})

describe('renderBottle', () => {
  it('is deterministic', () => {
    expect(draw(byId('jever'))).toBe(draw(byId('jever')))
  })

  it('offsets timings by seed only', () => {
    const a = draw(byId('jever'), { seed: 1 })
    const b = draw(byId('jever'), { seed: 2 })
    expect(a).not.toBe(b)
    const strip = (s: string) => s.replace(/(dur|begin)="[\d.]+s"/g, '')
    expect(strip(a)).toBe(strip(b))
  })

  it('leaves out all animation when still', () => {
    const svg = draw(byId('punk-ipa'), { still: true })
    expect(svg).not.toMatch(/<animate/)
    expect(draw(byId('punk-ipa'))).toMatch(/<animateTransform/)
  })

  it('escapes label text and sanitises the uid', () => {
    const beer = { ...byId('jever'), bottle: { ...byId('jever').bottle!, label: { ...byId('jever').bottle!.label, region: '<img src=x onerror=alert(1)>' } } }
    const svg = draw(beer, { uid: '"><script>' })
    expect(svg).not.toContain('<img')
    expect(svg).not.toContain('<script')
    expect(escapeXml(`a<b>&"'`)).toBe('a&#60;b&#62;&#38;&#34;&#39;')
  })

  it('scopes ids inside motifs per bottle', () => {
    const beer = byId('hofbraeu')
    expect(beer.bottle?.motif).toBe('lozenge')
    expect(draw(beer, { uid: 'one' })).toContain('id="one-lz"')
    expect(draw(beer, { uid: 'two' })).toContain('url(#two-lz)')
  })

  it('renders every beer of the catalogue', () => {
    for (const beer of beers) expect(draw(beer)).toMatch(/^<svg[\s\S]*<\/svg>$/)
  })
})

describe('textWidth', () => {
  it('measures with the real glyph widths', () => {
    expect(textWidth('PILS', 'serif', 100)).toBeGreaterThan(textWidth('PILS', 'sans800', 100))
    expect(textWidth('DOPPELBOCK', 'serif', 10)).toBeGreaterThan(textWidth('ALT', 'serif', 10) * 2.5)
  })
})

describe('sanitizeDesign', () => {
  it('keeps every hand-tuned design of beers.json unchanged', () => {
    for (const beer of beers.filter((b) => b.bottle)) expect(sanitizeDesign(beer.bottle)).toEqual(beer.bottle)
  })

  it('rejects anything that could leak into attributes', () => {
    const ok = byId('jever').bottle!
    expect(sanitizeDesign({ ...ok, glass: '#fff" onload="x' })).toBeUndefined()
    expect(sanitizeDesign({ ...ok, label: { ...ok.label, ink: 'red' } })).toBeUndefined()
    expect(sanitizeDesign({ ...ok, shape: 'magnum' })).toBeUndefined()
    expect(sanitizeDesign(null)).toBeUndefined()
  })

  it('drops unknown motifs, gestures and accessories instead of failing', () => {
    const ok = byId('jever').bottle!
    const d = sanitizeDesign({ ...ok, motif: 'logo-of-a-real-brand', gestures: ['sway', 'moonwalk', 'blink', 'hop'], acc: ['crown', 'tattoo'] })!
    expect(d.motif).toBeNull()
    expect(d.gestures).toEqual(['sway', 'blink'])
    expect(d.acc).toEqual(['crown'])
  })
})

describe('designFor', () => {
  it('derives a valid, deterministic design for every beer', () => {
    for (const beer of beers) {
      const d = designFor(beer)
      expect(sanitizeDesign(d)).toEqual(d)
      expect(designFor(beer)).toEqual(d)
      expect(d.gestures.length).toBeLessThanOrEqual(2)
      if (d.motif) expect(MOTIFS[d.motif]).toBeDefined()
    }
  })

  it('reads the style from the label word and picks the fitting shape', () => {
    expect(designFor(byId('punk-ipa')).shape).toBe('can')
    expect(designFor(byId('erdinger')).bulge).toBe(true)
    expect(designFor(byId('erdinger')).label.word).toBe('WEISSE')
    expect(styleRule('Kellerbier naturtrüb').word).toBe('KELLER')
    expect(styleRule('Hefeweizen dunkel').word).toBe('WEISSE')
    expect(styleRule('Irgendwas Neues').word).toBe('PILS')
  })

  it('turns the taste into a face', () => {
    const bitter = designFor(byId('jever'))
    expect(['stern', 'thick', 'angry']).toContain(bitter.brows)
    expect(bitter.mouth).toBe('flat')
    const sweet = beers.find((b) => b.taste.sweetness >= 60)!
    expect(designFor(sweet).acc).toContain('blush')
  })

  it('never lets an alcohol-free beer wobble', () => {
    for (const beer of beers.filter((b) => b.abv < 0.6)) expect(designFor(beer).gestures).not.toContain('wobble')
  })

  it('keeps Fraktur in mixed case', () => {
    const bock = { ...byId('einbecker-urbock'), id: 'bock-x', bottle: undefined }
    const d = [0, 1, 2, 3].map((i) => designFor({ ...bock, id: `bock-${i}` })).find((x) => x.label.font === 'gothic')!
    expect(d.label.word).toBe('Bock')
  })

  it('stays small enough to store per beer', () => {
    const sizes = beers.filter((b) => b.bottle).map((b) => JSON.stringify(b.bottle as BottleDesign).length)
    expect(Math.max(...sizes)).toBeLessThan(600)
  })
})

describe('parsePack', () => {
  it.each([
    ['500 ml', null, { ml: 500 }],
    ['0,33 l', null, { ml: 330 }],
    ['33 cl', 'en:glass-bottle', { ml: 330 }],
    ['6 x 0.33 l', null, { ml: 330 }],
    ['0,5 l', 'en:can,en:aluminium', { ml: 500, can: true }],
    ['500ml Dose', null, { ml: 500, can: true }],
    ['0,5 l', 'de:bügelflasche', { ml: 500, swing: true }],
    ['30 l', null, undefined],
    ['', '', undefined],
  ] as const)('%s / %s', (q, p, want) => {
    expect(parsePack(q, p)).toEqual(want)
  })
})

describe('designFor with product data', () => {
  const pils = { ...byId('jever'), id: 'r:test-pils', bottle: undefined }

  it('follows the container: can, 0.33 l, 0.5 l, swing top', () => {
    expect(designFor({ ...pils, pack: { ml: 500, can: true } }).shape).toBe('can')
    for (let i = 0; i < 12; i++) {
      const id = `r:p${i}`
      expect(['longneck33', 'vichy33', 'steinie']).toContain(designFor({ ...pils, id, pack: { ml: 330 } }).shape)
      expect(['longneck', 'nrw']).toContain(designFor({ ...pils, id, pack: { ml: 500 } }).shape)
      expect(designFor({ ...pils, id, pack: { swing: true } }).closure).toBe('swing')
    }
    // a style without a small bottle falls back to the 0.33 longneck
    const helles = { ...pils, style: 'Helles' }
    expect(designFor({ ...helles, pack: { ml: 330 } }).shape).toBe('longneck33')
  })

  it('prints the founding year as badge', () => {
    expect(designFor({ ...pils, founded: 1872 }).label.badge).toBe('SEIT 1872')
    expect(designFor({ ...pils, founded: 3 }).label.badge).toBeUndefined()
    expect(sanitizeDesign(designFor({ ...pils, founded: 1872 }))).toEqual(designFor({ ...pils, founded: 1872 }))
  })

  it('keeps designs of beers without product data unchanged', () => {
    expect(designFor({ ...pils, pack: undefined })).toEqual(designFor(pils))
  })
})
