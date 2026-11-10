import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { getFilters } from '@/api/items'
import type { FilterMeta, SortMeta } from '@/types/api'

export const useFilterMetaStore = defineStore('filterMeta', () => {
  const filters = ref<FilterMeta[]>([])
  const sorts = ref<SortMeta[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const error = shallowRef<unknown>(null)

  async function load(force = false): Promise<void> {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    error.value = null
    try {
      const res = await getFilters()
      filters.value = res.filters
      sorts.value = res.sorts
      loaded.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { filters, sorts, loaded, loading, error, load }
})
