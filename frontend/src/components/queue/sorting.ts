import type { SortMeta } from '@/types/api'

export interface SortColumn {
  key: string
  label: string
}

export interface SortState {
  key: string
  descending: boolean
}

export const SORT_COLUMNS: SortColumn[] = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'risk', label: 'Risk' },
  { key: 'submitter', label: 'Submitter' },
  { key: 'created_at', label: 'Created' },
]

const DEFAULT_SORT = '-created_at'

export function sortableColumns(sorts: SortMeta[]): SortColumn[] {
  const keys = new Set(sorts.map((s) => s.key))
  return SORT_COLUMNS.filter((c) => keys.has(c.key))
}

/** The active sort for a URL value; an empty value means the default (newest first). */
export function parseSort(sort: string): SortState {
  const value = sort || DEFAULT_SORT
  const descending = value.startsWith('-')
  return { key: descending ? value.slice(1) : value, descending }
}

/** Clicking the active column flips its direction; any other column starts ascending (Created: newest first). */
export function nextSort(current: string, key: string): string {
  const active = parseSort(current)
  if (active.key === key) return active.descending ? key : `-${key}`
  return key === 'created_at' ? `-${key}` : key
}
