import { readonly, ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'review-queue-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function writeStored(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage may be blocked (private mode); the theme still applies for this session.
  }
}

function darkQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
}

function systemTheme(): Theme {
  return darkQuery()?.matches ? 'dark' : 'light'
}

function apply(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

const theme = ref<Theme>('light')
let initialized = false
let chosen = false

function init(): void {
  if (initialized) return
  initialized = true
  const stored = readStored()
  chosen = stored !== null
  theme.value = stored ?? systemTheme()
  apply(theme.value)
  darkQuery()?.addEventListener('change', () => {
    if (chosen) return
    theme.value = systemTheme()
    apply(theme.value)
  })
}

function set(next: Theme): void {
  init()
  chosen = true
  theme.value = next
  apply(next)
  writeStored(next)
}

function toggle(): void {
  init()
  set(theme.value === 'dark' ? 'light' : 'dark')
}

export function useTheme() {
  init()
  return { theme: readonly(theme), toggle, set }
}
