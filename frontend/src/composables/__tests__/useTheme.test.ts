import { beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'review-queue-theme'

function mockSystem(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: dark, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}

async function load() {
  vi.resetModules()
  const { useTheme } = await import('@/composables/useTheme')
  return useTheme()
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useTheme', () => {
  it('uses the system preference when nothing is stored', async () => {
    mockSystem(true)
    const { theme } = await load()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('prefers a stored value over the system preference', async () => {
    mockSystem(true)
    localStorage.setItem(KEY, 'light')
    const { theme } = await load()
    expect(theme.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('ignores an invalid stored value and overwrites it on toggle', async () => {
    mockSystem(false)
    localStorage.setItem(KEY, 'purple')
    const { theme, toggle } = await load()
    expect(theme.value).toBe('light')
    toggle()
    expect(localStorage.getItem(KEY)).toBe('dark')
  })

  it('toggle flips the html class and persists the choice', async () => {
    mockSystem(false)
    const { theme, toggle } = await load()
    toggle()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(KEY)).toBe('dark')
    toggle()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem(KEY)).toBe('light')
  })

  it('still toggles when localStorage throws', async () => {
    mockSystem(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { theme, toggle } = await load()
    expect(() => toggle()).not.toThrow()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
