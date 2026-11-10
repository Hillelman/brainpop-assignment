import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useFilterMeta } from '@/composables/useFilterMeta'
import { useFilterMetaStore } from '@/stores/filterMeta'
import type { FiltersResponse } from '@/types/api'

const getFilters = vi.fn()
vi.mock('@/api/items', () => ({
  getFilters: (...args: unknown[]) => getFilters(...args),
}))

function response(...submitters: string[]): FiltersResponse {
  return {
    filters: [
      {
        key: 'submitter',
        label: 'Submitter',
        type: 'select',
        options: submitters.map((name, i) => ({ value: String(i + 1), label: name })),
      },
    ],
    sorts: [{ key: 'title', label: 'Title' }],
  }
}

function labels(store: ReturnType<typeof useFilterMetaStore>): string[] {
  return (store.filters[0]?.options ?? []).map((o) => o.label)
}

function mountQueue() {
  let api!: ReturnType<typeof useFilterMeta>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useFilterMeta()
        return () => h('div')
      },
    }),
  )
  return { api, wrapper }
}

describe('filterMeta store', () => {
  beforeEach(() => {
    getFilters.mockReset()
    setActivePinia(createPinia())
  })

  it('shows a newly added submitter after the queue is mounted again', async () => {
    getFilters.mockResolvedValueOnce(response('Ana')).mockResolvedValueOnce(response('Ana', 'Zoe'))
    const store = useFilterMetaStore()

    mountQueue().wrapper.unmount()
    await flushPromises()
    expect(labels(store)).toEqual(['Ana'])

    mountQueue()
    await flushPromises()
    expect(getFilters).toHaveBeenCalledTimes(2)
    expect(labels(store)).toEqual(['Ana', 'Zoe'])
  })

  it('keeps the previous options while a refetch is in flight', async () => {
    let resolve!: (value: FiltersResponse) => void
    getFilters.mockResolvedValueOnce(response('Ana')).mockReturnValueOnce(
      new Promise<FiltersResponse>((r) => {
        resolve = r
      }),
    )
    const store = useFilterMetaStore()
    await store.load()

    const pending = store.load()
    expect(store.loading).toBe(true)
    expect(labels(store)).toEqual(['Ana'])

    resolve(response('Ana', 'Zoe'))
    await pending
    expect(labels(store)).toEqual(['Ana', 'Zoe'])
  })

  it('does not refetch on mount after a failed load, and retry makes exactly one request', async () => {
    getFilters.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(response('Ana'))
    const store = useFilterMetaStore()

    mountQueue()
    await flushPromises()
    expect(store.error).toBeInstanceOf(Error)

    mountQueue()
    mountQueue()
    await flushPromises()
    expect(getFilters).toHaveBeenCalledTimes(1)

    const { api } = mountQueue()
    await api.retry()
    expect(getFilters).toHaveBeenCalledTimes(2)
    expect(store.error).toBeNull()
    expect(labels(store)).toEqual(['Ana'])
  })

  it('de-duplicates concurrent loads', async () => {
    getFilters.mockResolvedValue(response('Ana'))
    const store = useFilterMetaStore()

    await Promise.all([store.load(), store.load()])
    expect(getFilters).toHaveBeenCalledTimes(1)
  })

  it('keeps the previous options and sets error when a refetch fails', async () => {
    getFilters.mockResolvedValueOnce(response('Ana')).mockRejectedValueOnce(new Error('boom'))
    const store = useFilterMetaStore()
    await store.load()
    await store.load()

    expect(labels(store)).toEqual(['Ana'])
    expect(store.error).toBeInstanceOf(Error)

    await store.load()
    expect(getFilters).toHaveBeenCalledTimes(2)
  })
})
