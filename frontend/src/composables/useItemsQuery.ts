import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { listItems, searchItems } from '@/api/items'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import type { QueryState } from '@/composables/useQueryState'
import type { Item, ItemListParams, PaginationMeta } from '@/types/api'

export const SEARCH_DEBOUNCE_MS = 300

export function useItemsQuery(query: Ref<QueryState>) {
  const items = ref<Item[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const loading = ref(true)
  const error = shallowRef<unknown>(null)

  const q = computed(() => query.value.q.trim())
  const debouncedQ = useDebouncedRef(q, SEARCH_DEBOUNCE_MS)

  const params = computed<ItemListParams>(() => ({
    state: query.value.state,
    filter: query.value.filter,
    sort: query.value.sort || undefined,
    page: query.value.page,
    per_page: query.value.perPage,
  }))

  let controller: AbortController | null = null

  async function refresh(): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = null
    try {
      const search = debouncedQ.value
      const result = search
        ? await searchItems(search, params.value, { signal: current.signal })
        : await listItems(params.value, { signal: current.signal })
      if (controller !== current) return
      items.value = result.data
      meta.value = result.meta
    } catch (err) {
      if (controller !== current || current.signal.aborted) return
      items.value = []
      meta.value = null
      error.value = err
    } finally {
      if (controller === current) loading.value = false
    }
  }

  watch(
    () => JSON.stringify([debouncedQ.value, params.value]),
    () => void refresh(),
    {
      immediate: true,
    },
  )

  onScopeDispose(() => controller?.abort())

  return { items, meta, loading, error, refresh }
}
