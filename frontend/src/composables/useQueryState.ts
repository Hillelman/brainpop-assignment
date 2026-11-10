import { computed, watch, type ComputedRef } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router'

export interface QueryState {
  q: string
  filter: Record<string, string>
  sort: string
  page: number
  perPage: number
}

export const PER_PAGE_OPTIONS = [10, 25, 50]
export const DEFAULT_PER_PAGE = 25
const FILTER_PREFIX = 'filter['

function first(value: LocationQuery[string] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value
  return v ?? ''
}

function parseQuery(query: LocationQuery): QueryState {
  const filter: Record<string, string> = {}
  for (const key of Object.keys(query)) {
    if (!key.startsWith(FILTER_PREFIX) || !key.endsWith(']')) continue
    const value = first(query[key])
    if (value) filter[key.slice(FILTER_PREFIX.length, -1)] = value
  }
  const page = Number(first(query.page))
  const perPage = Number(first(query.perPage))
  return {
    q: first(query.q),
    filter,
    sort: first(query.sort),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    perPage: PER_PAGE_OPTIONS.includes(perPage) ? perPage : DEFAULT_PER_PAGE,
  }
}

function serialize(s: QueryState): LocationQueryRaw {
  const out: Record<string, string> = {}
  if (s.q) out.q = s.q
  if (s.sort) out.sort = s.sort
  if (s.page !== 1) out.page = String(s.page)
  if (s.perPage !== DEFAULT_PER_PAGE) out.perPage = String(s.perPage)
  for (const [key, value] of Object.entries(s.filter)) {
    if (value) out[`${FILTER_PREFIX}${key}]`] = value
  }
  return out
}

function sameQuery(a: LocationQueryRaw, b: LocationQuery): boolean {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  return keysA.length === keysB.length && keysA.every((k) => a[k] === first(b[k]))
}

export function useQueryState(): {
  query: ComputedRef<QueryState>
  update: (patch: Partial<QueryState>) => Promise<void>
  reset: () => Promise<void>
} {
  const route = useRoute()
  const router = useRouter()
  const query = computed(() => parseQuery(route.query))

  watch(
    () => route.query,
    (raw) => {
      const normalised = serialize(parseQuery(raw))
      if (!sameQuery(normalised, raw)) void router.replace({ query: normalised })
    },
    { immediate: true },
  )

  async function update(patch: Partial<QueryState>): Promise<void> {
    const next: QueryState = { ...query.value, ...patch }
    if (patch.page === undefined) next.page = 1
    const typing = Object.keys(patch).length === 1 && 'q' in patch
    const location = { query: serialize(next) }
    await (typing ? router.replace(location) : router.push(location))
  }

  async function reset(): Promise<void> {
    await router.replace({ query: {} })
  }

  return { query, update, reset }
}
