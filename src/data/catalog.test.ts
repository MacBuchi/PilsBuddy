import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Beer } from '../domain/types'
import { CATALOG_KEY, mergeCatalog, readCachedRows, refreshCatalog, toBeer } from './catalog'
import type { CatalogRow } from './catalog'
import raw from './beers.json'

const BUNDLED = raw as Beer[]
const jever = BUNDLED.find((b) => b.id === 'jever')!
const { id: _id, ...jeverData } = jever
const row = (id: string, data: unknown, sort = 0): CatalogRow => ({ id, data, sort })

function stubStorage() {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => void stored.set(k, v),
  })
  return stored
}

afterEach(() => vi.unstubAllGlobals())

describe('toBeer', () => {
  it('accepts a complete row and keeps only known fields', () => {
    const beer = toBeer(row('neu-pils', { ...jeverData, fullName: 'Neu Pils', extra: 'x' }))
    expect(beer?.id).toBe('neu-pils')
    expect(beer?.fullName).toBe('Neu Pils')
    expect(beer).not.toHaveProperty('extra')
    expect(beer?.reference).toBe(true)
  })

  it('rejects rows the app could not render', () => {
    expect(toBeer(row('Bad Id', jeverData))).toBeNull()
    expect(toBeer(row('x', { ...jeverData, taste: { ...jever.taste, body: 130 } }))).toBeNull()
    expect(toBeer(row('x', { ...jeverData, color: 'red' }))).toBeNull()
    expect(toBeer(row('x', { ...jeverData, name: '' }))).toBeNull()
    expect(toBeer(row('x', null))).toBeNull()
  })

  it('only allows our own bottle files as image', () => {
    expect(toBeer(row('x', { ...jeverData, image: 'https://evil.example/x.svg' }))?.image).toBeUndefined()
    expect(toBeer(row('x', { ...jeverData, image: '/bottles/x.svg' }))?.image).toBe('/bottles/x.svg')
  })
})

describe('mergeCatalog', () => {
  it('without rows it is the bundled JSON', () => {
    expect(mergeCatalog(BUNDLED, [])).toEqual(BUNDLED)
  })

  it('a row replaces a bundled beer in place and new beers are appended by sort', () => {
    const merged = mergeCatalog(BUNDLED, [
      row('zz-late', { ...jeverData, reference: false }, 2),
      row('jever', { ...jeverData, fullName: 'Jever Pilsener (neu)' }),
      row('aa-early', { ...jeverData, reference: false }, 1),
    ])
    expect(merged).toHaveLength(BUNDLED.length + 2)
    expect(merged.findIndex((b) => b.id === 'jever')).toBe(BUNDLED.findIndex((b) => b.id === 'jever'))
    expect(merged.find((b) => b.id === 'jever')?.fullName).toBe('Jever Pilsener (neu)')
    expect(merged.slice(-2).map((b) => b.id)).toEqual(['aa-early', 'zz-late'])
  })

  it('a broken row never removes the bundled beer', () => {
    const merged = mergeCatalog(BUNDLED, [row('jever', { broken: true })])
    expect(merged.find((b) => b.id === 'jever')).toEqual(jever)
  })
})

describe('refreshCatalog', () => {
  const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch

  it('caches the published rows for the next start', async () => {
    stubStorage()
    const rows = [row('neu-pils', jeverData, 1)]
    expect(await refreshCatalog(ok(rows))).toBe(true)
    expect(readCachedRows()).toEqual(rows)
    expect(await refreshCatalog(ok(rows))).toBe(false) // unchanged
  })

  it('keeps the cache when offline or the server answers garbage', async () => {
    const stored = stubStorage()
    stored.set(CATALOG_KEY, JSON.stringify({ v: 1, rows: [row('neu-pils', jeverData)] }))
    expect(await refreshCatalog(vi.fn(async () => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch)).toBe(false)
    expect(await refreshCatalog(vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch)).toBe(false)
    expect(await refreshCatalog(ok({ not: 'an array' }))).toBe(false)
    expect(readCachedRows()).toHaveLength(1)
  })

  it('ignores a cache from another version', () => {
    const stored = stubStorage()
    stored.set(CATALOG_KEY, JSON.stringify({ v: 99, rows: [row('x', jeverData)] }))
    expect(readCachedRows()).toEqual([])
  })
})
