import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QueueToolbar from '@/components/queue/QueueToolbar.vue'
import type { QueryState } from '@/composables/useQueryState'
import type { FilterMeta } from '@/types/api'

const query: QueryState = { q: '', filter: {}, sort: '', page: 1, perPage: 25 }
const filters: FilterMeta[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [{ value: 'approved', label: 'Approved' }],
  },
]

function mountToolbar(props: { metaFailed?: boolean; filters?: FilterMeta[] } = {}) {
  return mount(QueueToolbar, {
    props: { query, filters, metaFailed: false, showGrouped: false, groupedId: 'g', ...props },
    global: { stubs: { FilterControls: { template: '<div data-test="filter-controls" />' } } },
  })
}

describe('QueueToolbar', () => {
  it('renders no tabs and no sort select', () => {
    const wrapper = mountToolbar()
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.find('[role="tab"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Sort by"]').exists()).toBe(false)
  })

  it('puts the search input after the filter controls in the same row', () => {
    const wrapper = mountToolbar()
    const row = wrapper.get('[data-test="queue-toolbar"]')
    const controls = row.get('[data-test="filter-controls"]').element
    const search = row.get('input[aria-label="Search items"]').element
    expect(row.element.contains(search)).toBe(true)
    expect(controls.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(search.getAttribute('placeholder')).toBe('Search items…')
  })

  it('lays out the search at the end of a non-wrapping row on sm and up', () => {
    const wrapper = mountToolbar()
    const row = wrapper.get('[data-test="queue-toolbar"]')
    expect(row.classes()).toContain('sm:flex-row')
    const controls = row.get('[data-test="filter-controls"]')
    expect(controls.classes()).toEqual(expect.arrayContaining(['flex-1', 'min-w-0']))
    const searchWrapper = row.get('input[aria-label="Search items"]').element.parentElement
    expect(searchWrapper?.classList.contains('sm:shrink-0')).toBe(true)
    expect(row.element.lastElementChild).toBe(searchWrapper)
  })

  it('lets the retry state take the remaining space so search stays last', () => {
    const wrapper = mountToolbar({ metaFailed: true, filters: [] })
    const retry = wrapper.get('[data-test="queue-toolbar"]').element.firstElementChild
    expect(retry?.classList.contains('flex-1')).toBe(true)
  })

  it('shows the retry state and keeps the search when filters fail', async () => {
    const wrapper = mountToolbar({ metaFailed: true, filters: [] })
    expect(wrapper.text()).toContain('Filters could not be loaded.')
    expect(wrapper.find('input[aria-label="Search items"]').exists()).toBe(true)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retryMeta')).toHaveLength(1)
  })

  it('emits a cleared search from the clear button', async () => {
    const wrapper = mount(QueueToolbar, {
      props: {
        query: { ...query, q: 'abc' },
        filters: [],
        metaFailed: false,
        showGrouped: false,
        groupedId: 'g',
      },
    })
    await wrapper.get('[aria-label="Clear search"]').trigger('click')
    expect(wrapper.emitted('update')?.[0]).toEqual([{ q: '' }])
  })
})
