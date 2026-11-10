import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useItemsQuery } from '@/composables/useItemsQuery'
import type { QueryState } from '@/composables/useQueryState'
import type { Item, Paginated } from '@/types/api'

const listItems = vi.fn()
const searchItems = vi.fn()
vi.mock('@/api/items', () => ({
  listItems: (...args: unknown[]) => listItems(...args),
  searchItems: (...args: unknown[]) => searchItems(...args),
}))

function page(title: string): Paginated<Item> {
  return {
    data: [{ id: 1, title } as Item],
    meta: { current_page: 1, per_page: 25, total: 1, last_page: 1 },
  }
}

function base(): QueryState {
  return { state: 'pending', q: '', filter: {}, sort: '', page: 1, perPage: 25 }
}

function setup(initial: QueryState = base()) {
  const query = ref<QueryState>(initial)
  let api!: ReturnType<typeof useItemsQuery>
  mount(
    defineComponent({
      setup() {
        api = useItemsQuery(query)
        return () => h('div')
      },
    }),
  )
  return { query, api }
}

beforeEach(() => {
  vi.useFakeTimers()
  listItems.mockReset().mockResolvedValue(page('list'))
  searchItems.mockReset().mockResolvedValue(page('search'))
})
afterEach(() => vi.useRealTimers())

describe('useItemsQuery', () => {
  it('calls listItems when q is empty', async () => {
    const { api } = setup()
    await flushPromises()
    expect(listItems).toHaveBeenCalledTimes(1)
    expect(searchItems).not.toHaveBeenCalled()
    expect(api.items.value[0]?.title).toBe('list')
    expect(api.loading.value).toBe(false)
  })

  it('calls searchItems once, 300ms after rapid q changes', async () => {
    const { query } = setup()
    await flushPromises()
    for (const q of ['a', 'ab', 'abc']) {
      query.value = { ...query.value, q }
      await vi.advanceTimersByTimeAsync(100)
    }
    expect(searchItems).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    expect(searchItems).toHaveBeenCalledTimes(1)
    expect(searchItems.mock.calls[0]?.[0]).toBe('abc')
  })

  it('aborts the previous request and ignores a stale response', async () => {
    const resolvers: ((v: Paginated<Item>) => void)[] = []
    const signals: AbortSignal[] = []
    listItems.mockImplementation((_p: unknown, opts: { signal: AbortSignal }) => {
      signals.push(opts.signal)
      return new Promise((resolve) => resolvers.push(resolve))
    })
    const { query, api } = setup()
    query.value = { ...query.value, page: 2 }
    await flushPromises()
    expect(signals[0]?.aborted).toBe(true)
    resolvers[1]?.(page('fresh'))
    await flushPromises()
    resolvers[0]?.(page('stale'))
    await flushPromises()
    expect(api.items.value[0]?.title).toBe('fresh')
  })

  it('exposes errors and refresh refetches', async () => {
    listItems.mockRejectedValueOnce(new Error('boom'))
    const { api } = setup()
    await flushPromises()
    expect(api.error.value).toBeInstanceOf(Error)
    await api.refresh()
    expect(api.error.value).toBeNull()
    expect(api.items.value).toHaveLength(1)
  })
})
