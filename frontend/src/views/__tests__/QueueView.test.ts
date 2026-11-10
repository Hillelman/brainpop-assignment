import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import QueueView from '@/views/QueueView.vue'
import type { FilterMeta, Item, Paginated } from '@/types/api'

const listItems = vi.fn()
const getFilters = vi.fn()
vi.mock('@/api/items', () => ({
  listItems: (...a: unknown[]) => listItems(...a),
  searchItems: vi.fn(),
  getFilters: (...a: unknown[]) => getFilters(...a),
  bulkReview: vi.fn(),
}))

const item: Item = {
  id: 7,
  title: 'Hello item',
  description: '',
  status: 'pending',
  risk: null,
  submitter: { id: 1, name: 'Ann' },
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
}

const dateFilters: FilterMeta[] = [
  {
    key: 'created_from',
    label: 'From',
    type: 'date',
    group: 'created_at',
    group_label: 'Created at',
  },
  { key: 'created_to', label: 'To', type: 'date', group: 'created_at', group_label: 'Created at' },
  {
    key: 'reviewed_from',
    label: 'From',
    type: 'date',
    group: 'reviewed_at',
    group_label: 'Reviewed at',
  },
  {
    key: 'reviewed_to',
    label: 'To',
    type: 'date',
    group: 'reviewed_at',
    group_label: 'Reviewed at',
  },
]

function result(data: Item[]): Paginated<Item> {
  return { data, meta: { current_page: 1, per_page: 25, total: data.length, last_page: 1 } }
}

async function mountView(path = '/items') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/items', component: QueueView },
      { path: '/items/:id', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(QueueView, { global: { plugins: [router, createPinia()] } })
  return Object.assign(wrapper, { router })
}

beforeEach(() => {
  vi.clearAllMocks()
  getFilters.mockResolvedValue({ filters: [], sorts: [] })
})

describe('QueueView', () => {
  it('shows the skeleton while loading, then the table', async () => {
    let resolve!: (value: Paginated<Item>) => void
    listItems.mockReturnValue(new Promise((r) => (resolve = r)))
    const wrapper = await mountView()
    expect(wrapper.find('[data-test="items-skeleton"]').exists()).toBe(true)
    resolve(result([item]))
    await flushPromises()
    expect(wrapper.find('[data-test="items-skeleton"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/items/7"]').exists()).toBe(true)
  })

  it('shows the empty state when there is no data', async () => {
    listItems.mockResolvedValue(result([]))
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('No items yet')
  })

  it('shows an inline error and Retry refetches', async () => {
    listItems.mockRejectedValueOnce(new ApiError(500, 'server_error', 'x'))
    listItems.mockResolvedValue(result([item]))
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.find('[data-test="list-error"]').exists()).toBe(true)
    await wrapper.get('[data-test="list-error"] button').trigger('click')
    await flushPromises()
    expect(listItems).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="list-error"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/items/7"]').exists()).toBe(true)
  })

  it('still works when filter metadata fails to load', async () => {
    getFilters.mockRejectedValue(new Error('nope'))
    listItems.mockResolvedValue(result([item]))
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Filters could not be loaded')
    expect(wrapper.find('a[href="/items/7"]').exists()).toBe(true)
  })

  it('has no header Clear filters button without filters', async () => {
    listItems.mockResolvedValue(result([item]))
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.find('[data-test="header-clear-filters"]').exists()).toBe(false)
  })

  it('shows Clear filters last in the title row when a filter is set', async () => {
    listItems.mockResolvedValue(result([item]))
    const wrapper = await mountView('/items?filter[status]=approved')
    await flushPromises()
    const button = wrapper.get('[data-test="header-clear-filters"]')
    expect(button.text()).toBe('Clear filters')
    const row = wrapper.get('h1').element.parentElement
    expect(button.element.parentElement).toBe(row)
    expect(row?.lastElementChild).toBe(button.element)
  })

  it('toggles the date filters, labelled More filters / Less filters', async () => {
    listItems.mockResolvedValue(result([item]))
    getFilters.mockResolvedValue({ filters: dateFilters, sorts: [] })
    const wrapper = await mountView()
    await flushPromises()
    const toggle = wrapper.get('[data-test="toggle-more-filters"]')
    expect(toggle.text()).toBe('More filters')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
    await toggle.trigger('click')
    expect(toggle.text()).toBe('Less filters')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.attributes('aria-controls')).toBe(
      wrapper.get('[data-test="filter-groups"]').attributes('id'),
    )
    expect(wrapper.findAll('[data-test="filter-group"]')).toHaveLength(2)
    await toggle.trigger('click')
    expect(toggle.text()).toBe('More filters')
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
  })

  it('starts expanded when a date filter is in the query and stays expanded after clearing', async () => {
    listItems.mockResolvedValue(result([item]))
    getFilters.mockResolvedValue({ filters: dateFilters, sorts: [] })
    const wrapper = await mountView('/items?filter[created_from]=2026-01-01')
    await flushPromises()
    expect(wrapper.get('[data-test="toggle-more-filters"]').attributes('aria-expanded')).toBe(
      'true',
    )
    await wrapper.get('[data-test="header-clear-filters"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="toggle-more-filters"]').attributes('aria-expanded')).toBe(
      'true',
    )
  })

  it('places the toggle right before Clear filters, or last when it is hidden', async () => {
    listItems.mockResolvedValue(result([item]))
    getFilters.mockResolvedValue({ filters: dateFilters, sorts: [] })
    const wrapper = await mountView()
    await flushPromises()
    const toggle = wrapper.get('[data-test="toggle-more-filters"]')
    expect(toggle.element.parentElement?.lastElementChild).toBe(toggle.element)
    await wrapper.router.push('/items?filter[status]=approved')
    await flushPromises()
    const clear = wrapper.get('[data-test="header-clear-filters"]')
    expect(clear.element.previousElementSibling).toBe(toggle.element)
  })

  it('has no toggle without grouped filters', async () => {
    listItems.mockResolvedValue(result([item]))
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.find('[data-test="toggle-more-filters"]').exists()).toBe(false)
  })

  it('clears filters, keeps the search and resets the page', async () => {
    listItems.mockResolvedValue(result([item]))
    const wrapper = await mountView('/items?q=foo&filter[status]=approved&page=3')
    await flushPromises()
    await wrapper.get('[data-test="header-clear-filters"]').trigger('click')
    await flushPromises()
    expect(wrapper.router.currentRoute.value.query).toEqual({ q: 'foo' })
    expect(wrapper.find('[data-test="header-clear-filters"]').exists()).toBe(false)
  })
})
