import { describe, expect, it } from 'vitest'
import { normalizeCode } from './code'

describe('normalizeCode', () => {
  it('accepts sloppy input', () => {
    expect(normalizeCode('pils-7k3q-m9xd-2hta-wxyz')).toBe('PILS-7K3Q-M9XD-2HTA-WXYZ')
    expect(normalizeCode(' 7K3Q M9XD 2HTA WXYZ ')).toBe('PILS-7K3Q-M9XD-2HTA-WXYZ')
  })
  it('rejects wrong length and confusable letters', () => {
    expect(normalizeCode('PILS-7K3Q-M9XD-2HTA')).toBeNull()
    expect(normalizeCode('PILS-0K3Q-M9XD-2HTA-WXYZ')).toBeNull()
    expect(normalizeCode('')).toBeNull()
  })
})
