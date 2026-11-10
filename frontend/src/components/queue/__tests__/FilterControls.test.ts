import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterControls from '@/components/queue/FilterControls.vue'
import { Select } from '@/components/ui/select'
import type { FilterMeta } from '@/types/api'

const filters: FilterMeta[] = [
  { key: 'risk', label: 'Risk', type: 'select', options: [{ value: 'high', label: 'High' }] },
  { key: 'created_from', label: 'Created from', type: 'date' },
]

describe('FilterControls', () => {
  it('renders one control per filter', () => {
    const wrapper = mount(FilterControls, { props: { filters, modelValue: {} } })
    expect(wrapper.findAll('[data-test="filter-control"]')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Clear filters')
  })

  it('emits the filter object when a select changes', () => {
    const wrapper = mount(FilterControls, {
      props: { filters, modelValue: { created_from: '2026-01-01' } },
    })
    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'high')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      { created_from: '2026-01-01', risk: 'high' },
    ])
  })

  it('emits when a date changes', async () => {
    const wrapper = mount(FilterControls, { props: { filters, modelValue: { risk: 'high' } } })
    await wrapper.get('input[type="date"]').setValue('2026-02-02')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      { risk: 'high', created_from: '2026-02-02' },
    ])
  })
})

const layoutFilters: FilterMeta[] = [
  { key: 'status', label: 'Status', type: 'select', options: [] },
  { key: 'risk', label: 'Risk', type: 'select', options: [] },
  { key: 'submitter', label: 'Submitter', type: 'select', options: [] },
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

describe('FilterControls layout', () => {
  it('puts ungrouped filters in the first row and keeps dates out of it', () => {
    const wrapper = mount(FilterControls, { props: { filters: layoutFilters, modelValue: {} } })
    const row = wrapper.get('[data-test="filter-row"]')
    expect(row.findAll('[aria-label]').map((n) => n.attributes('aria-label'))).toEqual([
      'Status',
      'Risk',
      'Submitter',
    ])
    expect(row.find('input[type="date"]').exists()).toBe(false)
  })

  it('renders one labelled row per group in order with named inputs', () => {
    const wrapper = mount(FilterControls, { props: { filters: layoutFilters, modelValue: {} } })
    const groups = wrapper.findAll('[data-test="filter-group"]')
    expect(groups.map((g) => g.get('[data-test="filter-group-label"]').text())).toEqual([
      'Created at',
      'Reviewed at',
    ])
    expect(groups).toHaveLength(2)
    const [created, reviewed] = groups
    if (!created || !reviewed) throw new Error('expected two group rows')
    expect(created.element.firstElementChild?.getAttribute('data-test')).toBe('filter-group-label')
    expect(reviewed.findAll('input').map((i) => i.attributes('aria-label'))).toEqual([
      'Reviewed at from',
      'Reviewed at to',
    ])
    expect(created.attributes('aria-labelledby')).toBe(
      created.get('[data-test="filter-group-label"]').attributes('id'),
    )
  })

  it('adds new ungrouped filters to the first row and new groups as new rows', () => {
    const extra: FilterMeta[] = [
      ...layoutFilters,
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'due_from', label: 'From', type: 'date', group: 'due', group_label: 'Due' },
    ]
    const wrapper = mount(FilterControls, { props: { filters: extra, modelValue: {} } })
    expect(wrapper.get('[data-test="filter-row"]').find('input[aria-label="Owner"]').exists()).toBe(
      true,
    )
    expect(wrapper.findAll('[data-test="filter-group"]')).toHaveLength(3)
  })

  it('renders only the first row without groups', () => {
    const wrapper = mount(FilterControls, { props: { filters, modelValue: {} } })
    expect(wrapper.findAll('[data-test="filter-group"]')).toHaveLength(0)
  })
})
