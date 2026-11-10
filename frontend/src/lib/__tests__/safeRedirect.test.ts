import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/lib/safeRedirect'

describe('safeRedirect', () => {
  it('returns a same-origin path unchanged', () => {
    expect(safeRedirect('/items/42?tab=x#h')).toBe('/items/42?tab=x#h')
  })

  it.each([
    '//evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '/\t/evil.com',
    '/.//evil.com',
    '/..//evil.com',
    '',
    ['/a', '/b'],
    undefined,
  ])('returns the fallback for %j', (value) => {
    expect(safeRedirect(value)).toBe('/items')
  })

  it('uses a custom fallback', () => {
    expect(safeRedirect(undefined, '/home')).toBe('/home')
  })
})
