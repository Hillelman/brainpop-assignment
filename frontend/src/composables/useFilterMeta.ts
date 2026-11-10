import { storeToRefs } from 'pinia'
import { useFilterMetaStore } from '@/stores/filterMeta'

export function useFilterMeta() {
  const store = useFilterMetaStore()
  const { filters, sorts, loading, error } = storeToRefs(store)
  void store.load()
  return { filters, sorts, loading, error, retry: () => store.load(true) }
}
