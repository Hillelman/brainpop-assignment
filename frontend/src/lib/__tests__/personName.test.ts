import { describe, expect, it } from 'vitest'
import { cleanName, nameError, normalize, sameName } from '@/lib/personName'

describe('personName', () => {
  it('normalizes whitespace and case', () => {
    expect(normalize('  Ana   Lopez ')).toBe('ana lopez')
    expect(cleanName('  Ana   Lopez ')).toBe('Ana Lopez')
  })

  it('compares names after normalization', () => {
    expect(sameName('  Ana   Lopez ', 'ana lopez')).toBe(true)
    expect(sameName('José', 'Jose')).toBe(false)
    expect(sameName('', '  ')).toBe(false)
  })

  it('validates length 2 to 60 on the cleaned name', () => {
    expect(nameError('   ')).toContain('at least 2')
    expect(nameError('a')).toContain('at least 2')
    expect(nameError('ab')).toBeUndefined()
    expect(nameError('x'.repeat(60))).toBeUndefined()
    expect(nameError('x'.repeat(61))).toContain('at most 60')
    expect(nameError('a      b')).toBeUndefined()
  })
})
