import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { getItemReviews } from '@/api/items'
import type { Review } from '@/types/api'

const PER_PAGE = 5

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useItemReviews(id: MaybeRefOrGetter<number>) {
  const reviews: Ref<Review[]> = ref([])
  const page = ref(0)
  const lastPage = ref(1)
  const loading = ref(false)
  const error: Ref<unknown> = ref(null)
  let controller: AbortController | null = null

  async function fetchPage(target: number, replace: boolean): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = null
    try {
      const res = await getItemReviews(
        toValue(id),
        { page: target, per_page: PER_PAGE },
        { signal: current.signal },
      )
      if (current.signal.aborted) return
      reviews.value = replace ? res.data : [...reviews.value, ...res.data]
      page.value = res.meta.current_page
      lastPage.value = res.meta.last_page
    } catch (err) {
      if (current.signal.aborted || isAbort(err)) return
      error.value = err
    } finally {
      if (controller === current) loading.value = false
    }
  }

  function refresh(): Promise<void> {
    return fetchPage(1, true)
  }

  function loadMore(): Promise<void> {
    if (loading.value || page.value >= lastPage.value) return Promise.resolve()
    return fetchPage(page.value + 1, false)
  }

  watch(
    () => toValue(id),
    () => {
      reviews.value = []
      page.value = 0
      lastPage.value = 1
      void refresh()
    },
    { immediate: true },
  )
  onScopeDispose(() => controller?.abort())

  return {
    reviews,
    page,
    lastPage,
    loading,
    error,
    hasMore: () => page.value < lastPage.value,
    refresh,
    loadMore,
  }
}
