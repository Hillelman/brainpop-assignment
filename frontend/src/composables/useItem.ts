import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { ApiError } from '@/api/http'
import { getItem } from '@/api/items'
import type { Item } from '@/types/api'

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useItem(id: MaybeRefOrGetter<number>) {
  const item: Ref<Item | null> = ref(null)
  const loading = ref(true)
  const error: Ref<unknown> = ref(null)
  const notFound = ref(false)
  let controller: AbortController | null = null

  async function load(): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      const result = await getItem(toValue(id), { signal: current.signal })
      if (current.signal.aborted) return
      item.value = result
    } catch (err) {
      if (current.signal.aborted || isAbort(err)) return
      item.value = null
      if (err instanceof ApiError && err.status === 404) notFound.value = true
      else error.value = err
    } finally {
      if (controller === current) loading.value = false
    }
  }

  watch(() => toValue(id), load, { immediate: true })
  onScopeDispose(() => controller?.abort())

  return { item, loading, error, notFound, refresh: load }
}
