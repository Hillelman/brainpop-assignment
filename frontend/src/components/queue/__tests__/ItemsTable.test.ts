import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemsTable from '@/components/queue/ItemsTable.vue'
import type { Item, SortMeta } from '@/types/api'

const sorts: SortMeta[] = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'risk', label: 'Risk' },
  { key: 'submitter', label: 'Submitter' },
  { key: 'created_at', label: 'Created' },
]

function mountTable(sort: string, available: SortMeta[] = sorts) {
  return mount(ItemsTable, {
    props: { items: [] as Item[], selectedIds: [], allSelected: false, sorts: available, sort },
    global: { stubs: { MobileSortMenu: true } },
  })
}

function header(wrapper: ReturnType<typeof mountTable>, label: string) {
  const th = wrapper.findAll('th').find((h) => h.text() === label)
  if (!th) throw new Error(`No header ${label}`)
  return th
}

describe('ItemsTable header sorting', () => {
  it('emits ascending then descending when the Title header is clicked', async () => {
    const wrapper = mountTable('')
    await header(wrapper, 'Title').get('button').trigger('click')
    expect(wrapper.emitted('sort')?.[0]).toEqual(['title'])

    await wrapper.setProps({ sort: 'title' })
    await header(wrapper, 'Title').get('button').trigger('click')
    expect(wrapper.emitted('sort')?.[1]).toEqual(['-title'])
  })

  it('shows the active arrow and aria-sort, others are none', () => {
    const wrapper = mountTable('title')
    expect(header(wrapper, 'Title').attributes('aria-sort')).toBe('ascending')
    expect(header(wrapper, 'Title').find('svg.lucide-arrow-up').exists()).toBe(true)
    for (const label of ['Status', 'Risk', 'Submitter', 'Created']) {
      expect(header(wrapper, label).attributes('aria-sort')).toBe('none')
    }
    const descending = mountTable('-title')
    expect(header(descending, 'Title').attributes('aria-sort')).toBe('descending')
    expect(header(descending, 'Title').find('svg.lucide-arrow-down').exists()).toBe(true)
  })

  it.each(['', '-created_at'])('treats Created as active and descending for sort "%s"', (sort) => {
    const wrapper = mountTable(sort)
    expect(header(wrapper, 'Created').attributes('aria-sort')).toBe('descending')
    expect(header(wrapper, 'Created').find('svg.lucide-arrow-down').exists()).toBe(true)
    expect(header(wrapper, 'Title').attributes('aria-sort')).toBe('none')
  })

  it('clicking the active Created header sorts oldest first, an inactive one newest first', async () => {
    const wrapper = mountTable('title')
    await header(wrapper, 'Created').get('button').trigger('click')
    expect(wrapper.emitted('sort')?.[0]).toEqual(['-created_at'])
    await wrapper.setProps({ sort: '' })
    await header(wrapper, 'Created').get('button').trigger('click')
    expect(wrapper.emitted('sort')?.[1]).toEqual(['created_at'])
  })

  it.each([
    ['Status', 'status'],
    ['Submitter', 'submitter'],
  ])('makes the %s header clickable and emits its sort key', async (label, key) => {
    const wrapper = mountTable('')
    await header(wrapper, label).get('button').trigger('click')
    expect(wrapper.emitted('sort')?.[0]).toEqual([key])

    await wrapper.setProps({ sort: key })
    expect(header(wrapper, label).attributes('aria-sort')).toBe('ascending')
    await header(wrapper, label).get('button').trigger('click')
    expect(wrapper.emitted('sort')?.[1]).toEqual([`-${key}`])
  })

  it('renders a column missing from sorts as plain text', () => {
    const wrapper = mountTable(
      '',
      sorts.filter((s) => s.key !== 'status'),
    )
    const status = header(wrapper, 'Status')
    expect(status.find('button').exists()).toBe(false)
    expect(status.attributes('aria-sort')).toBeUndefined()
    expect(header(wrapper, 'Title').find('button').exists()).toBe(true)
  })

  it('marks no column active for an unknown sort', () => {
    const wrapper = mountTable('-bogus')
    for (const label of ['Title', 'Status', 'Risk', 'Submitter', 'Created']) {
      expect(header(wrapper, label).attributes('aria-sort')).toBe('none')
    }
  })
})
