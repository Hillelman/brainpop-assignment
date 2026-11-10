import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { getFilters } from '@/api/items'
import type { FilterMeta, SortMeta } from '@/types/api'

export const useFilterMetaStore = defineStore('filterMeta', () => {
  const filters = ref<FilterMeta[]>([])
  const sorts = ref<SortMeta[]>([])
  const attempted = ref(false)
  const lastSucceeded = ref(false)
  const loading = ref(false)
  const error = shallowRef<unknown>(null)

  async function load(force = false): Promise<void> {
    if (loading.value) return
    // A failed load is only retried explicitly, which keeps the 401 loop protection.
    if (!force && attempted.value && !lastSucceeded.value) return
    attempted.value = true
    loading.value = true
    error.value = null
    try {
      const res = await getFilters()
      filters.value = res.filters
      sorts.value = res.sorts
      lastSucceeded.value = true
    } catch (err) {
      lastSucceeded.value = false
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { filters, sorts, loading, error, load }
})
