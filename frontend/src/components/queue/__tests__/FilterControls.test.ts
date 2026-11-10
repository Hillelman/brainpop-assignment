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
