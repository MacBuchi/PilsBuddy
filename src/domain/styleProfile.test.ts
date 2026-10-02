import { describe, expect, it } from 'vitest'
import beers from '../data/beers.json'
import { styleRule } from './bottles/design'
import { normalizeStyle, STYLE_PROFILES, styleColor, tasteFromStyle } from './styleProfile'
import { TASTE_AXES } from './types'
import type { TasteVector } from './types'

const curated = beers as unknown as { id: string; fullName: string; style: string; abv: number; taste: TasteVector }[]

describe('normalizeStyle', () => {
  it.each([
    // real Open Food Facts product names
    ['Lagerbier Hell', 'Helles'],
    ['Feinherb -Spritziges Edelpils', 'Pils'],
    ['Warsteiner herb', 'Pils'],
    ['Jever Pilsener', 'Pils'],
    ['Einbecker Kellerbier', 'Kellerbier'],
    ['Gaffel Wiess', 'Kölsch'],
    ['Erdinger Kristall', 'Weißbier'],
    ['Hefeweißbier Dunkel', 'Dunkles Weißbier'],
    ['Aventinus Weizenbock', 'Bock'],
    ['Paulaner Salvator', 'Doppelbock'],
    ['Doppel Bock Dunkel', 'Doppelbock'],
    ['Schlenkerla Rauchbier Märzen', 'Rauchbier'],
    ['Chameleon India Pale Ale', 'IPA'],
    ['Voyage Pale Ale', 'Pale Ale'],
    ['Wiener Lager', 'Amber'],
    ['Naturradler Zitrone', 'Radler'],
    ['Rappen Export', 'Export'],
    ['Wiesn Festbier', 'Märzen'],
    ['Köstritzer Schwarzbier', 'Schwarzbier'],
    ['Uerige Alt', 'Altbier'],
  ])('%s → %s', (name, style) => {
    expect(normalizeStyle([name])).toBe(style)
  })

  it.each([
    // North American and Belgian/British names (Stufe N)
    ['Budweiser American Lager', 'American Lager'],
    ['Molson Canadian Lager', 'American Lager'],
    ['Bud Light', 'Light Lager'],
    ['Miller Lite', 'Light Lager'],
    ['Genesee Cream Ale', 'Cream Ale'],
    ['805 Blonde Ale', 'Blonde Ale'],
    ['Big Wave Golden Ale', 'Blonde Ale'],
    ['Leffe Blonde', 'Abbey Blonde'],
    ['Blanche de Chambly', 'Witbier'],
    ['Allagash White Ale', 'Witbier'],
    ['Gumballhead American Wheat', 'Wheat Ale'],
    ['Huckleberry Wheat Ale', 'Wheat Ale'],
    ['Erdinger wheat beer', 'Weißbier'],
    ['California Common', 'California Common'],
    ['Arkell Best Bitter', 'Bitter'],
    ['La Vache Folle ESB', 'Bitter'],
    ['Traditional Ale English-style Brown Ale', 'Brown Ale'],
    ['90 Shilling Scottish Ale', 'Scotch Ale'],
    ['Pliny the Elder Double IPA', 'Double IPA'],
    ['Maharaja Imperial IPA', 'Double IPA'],
    ['Heady Topper DIPA', 'Double IPA'],
    ['Julius New England IPA', 'Hazy IPA'],
    ['Hazy IPA', 'Hazy IPA'],
    ['Two Hearted Ale American IPA', 'IPA'],
    ['Navigator IPA', 'IPA'],
    ['Left Hand Milk Stout Nitro', 'Milk Stout'],
    ['Péché Mortel Imperial Coffee Stout', 'Imperial Stout'],
    ['Russian Imperial Stout', 'Imperial Stout'],
    ['Bigfoot Barleywine Style Ale', 'Barleywine'],
    ['Saison du Pinacle', 'Saison'],
    ['Tank 7 Farmhouse Ale', 'Saison'],
    ['La Fin du Monde Belgian Tripel', 'Tripel'],
    ["Monk's Indiscretion Dubbel", 'Dubbel'],
    ['Three Philosophers Quadrupel', 'Quadrupel'],
    ['Jelly King Dry-hopped Sour', 'Sour Ale'],
    ['La Roja Flanders Red Ale', 'Sour Ale'],
    ['Fat Tire Amber Ale', 'Amber'],
  ])('%s → %s', (name, style) => {
    expect(normalizeStyle([name])).toBe(style)
  })

  it('keeps German words that look like English styles German', () => {
    expect(normalizeStyle(['Saisonbier Hell'])).toBe('Helles')
    expect(normalizeStyle(['Paulaner Salvator'])).toBe('Doppelbock')
    expect(normalizeStyle(['Maxiator Bockbier'])).toBe('Doppelbock')
    expect(normalizeStyle(['Bambergator'])).toBe('Doppelbock')
    expect(normalizeStyle(['Shilling Hell'])).toBe('Helles')
    expect(normalizeStyle(['Steam Whistle Pilsner'])).toBe('Pils')
    expect(normalizeStyle(['Becks Blue non alcoholic'])).toBe('Alkoholfrei')
  })

  it('reads every canonical style name back as itself', () => {
    for (const s of Object.keys(STYLE_PROFILES)) expect(normalizeStyle([s]), s).toBe(s)
  })

  it('prefers the product name over categories', () => {
    expect(normalizeStyle(['Pinkus Pils', 'en:beers en:lagers'])).toBe('Pils')
    expect(normalizeStyle(['Krug-Bräu', 'en:beers en:wheat-beers'])).toBe('Weißbier')
  })

  it('turns alcohol-free beers into the alcohol-free styles, but keeps Radler', () => {
    expect(normalizeStyle(['Warsteiner Pilsener Alkoholfrei'])).toBe('Alkoholfrei')
    expect(normalizeStyle(['Erdinger Weißbier'], 0.4)).toBe('Alkoholfreies Weißbier')
    expect(normalizeStyle(['Radler alkoholfrei'])).toBe('Radler')
    expect(normalizeStyle(['Bier'], 0.0)).toBe('Alkoholfrei')
  })

  it('returns null when nothing is known', () => {
    expect(normalizeStyle(['Bier', null, undefined, ''])).toBeNull()
    expect(normalizeStyle([])).toBeNull()
  })
})

describe('tasteFromStyle', () => {
  it('is deterministic and stays within 0–100', () => {
    for (const s of [...Object.keys(STYLE_PROFILES), 'Unbekannt']) {
      for (const abv of [0, 2.5, 5, 9, 14]) {
        const t = tasteFromStyle(s, abv, 60)
        expect(tasteFromStyle(s, abv, 60)).toEqual(t)
        for (const a of TASTE_AXES) {
          expect(t[a]).toBeGreaterThanOrEqual(0)
          expect(t[a]).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('gives unknown styles a neutral profile', () => {
    expect(tasteFromStyle(null)).toEqual(tasteFromStyle('Gibt es nicht'))
    expect(styleColor(null)).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('makes stronger beers fuller and less drinkable', () => {
    let prev = tasteFromStyle('Helles', 4)
    for (const abv of [5, 6, 7, 8]) {
      const t = tasteFromStyle('Helles', abv)
      expect(t.body).toBeGreaterThanOrEqual(prev.body)
      expect(t.maltiness).toBeGreaterThanOrEqual(prev.maltiness)
      expect(t.drinkability).toBeLessThanOrEqual(prev.drinkability)
      prev = t
    }
  })

  it('takes bitterness from IBU when known', () => {
    expect(tasteFromStyle('Pils', 4.9, 40).bitterness).toBeGreaterThan(tasteFromStyle('Pils', 4.9, 20).bitterness)
    expect(tasteFromStyle('IPA', 6, 70).bitterness).toBe(100)
  })

  it('estimates the curated beers within 8 points per axis on average', () => {
    // style estimate vs the hand-made profile: the honest error a „Stil-Schätzung“ carries
    let sum = 0
    for (const b of curated) {
      const t = tasteFromStyle(b.style, b.abv)
      sum += TASTE_AXES.reduce((s, a) => s + Math.abs(t[a] - b.taste[a]), 0) / TASTE_AXES.length
    }
    expect(sum / curated.length).toBeLessThan(8)
  })

  it('has a bottle style rule for every style profile', () => {
    for (const s of Object.keys(STYLE_PROFILES)) if (s !== 'Pils') expect(styleRule(s).word, s).not.toBe('PILS')
  })
})
