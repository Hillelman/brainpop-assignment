export const NAME_MIN = 2
export const NAME_MAX = 60

/** Trims and collapses internal whitespace, keeping the original casing. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Comparison key: cleaned and lower-cased. Accents are significant. */
export function normalize(name: string): string {
  return cleanName(name).toLowerCase()
}

export function sameName(a: string, b: string): boolean {
  const left = normalize(a)
  return left !== '' && left === normalize(b)
}

export function nameError(name: string, label = 'Name'): string | undefined {
  const length = cleanName(name).length
  if (length < NAME_MIN) return `${label} must be at least ${NAME_MIN} characters.`
  if (length > NAME_MAX) return `${label} must be at most ${NAME_MAX} characters.`
  return undefined
}
