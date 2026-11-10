function hasUnsafeChars(value: string): boolean {
  return [...value].some((char) => {
    const code = char.charCodeAt(0)
    return char === '\\' || code <= 0x1f || code === 0x7f
  })
}

export function safeRedirect(target: unknown, fallback = '/items'): string {
  if (typeof target !== 'string') return fallback
  if (!target.startsWith('/') || target.startsWith('//') || hasUnsafeChars(target)) {
    return fallback
  }
  try {
    const url = new URL(target, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    if (url.pathname.startsWith('//')) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}
