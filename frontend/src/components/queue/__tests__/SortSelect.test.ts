import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import SortSelect from '@/components/queue/SortSelect.vue'
import { Select } from '@/components/ui/select'
import type { SortMeta } from '@/types/api'

const sorts: SortMeta[] = [
  { key: 'created_at', label: 'Created' },
  { key: 'title', label: 'Title' },
  { key: 'risk', label: 'Risk' },
]

const SelectItemStub = defineComponent({
  props: { value: { type: String, required: true } },
  template:
    '<div role="option" :data-value="value" :aria-label="$slots.default?.()[0]?.children"><slot /></div>',
})

function mountSort(modelValue: string) {
  return mount(SortSelect, {
    props: { sorts, modelValue },
    global: {
      stubs: {
        Select: false,
        SelectTrigger: { template: '<button aria-label="Sort by"><slot /></button>' },
        SelectValue: true,
        SelectContent: { template: '<div><slot /></div>' },
        SelectItem: SelectItemStub,
      },
    },
  })
}

describe('SortSelect', () => {
  it('renders ascending and descending options for every sort', () => {
    const wrapper = mountSort('')
    const values = wrapper.findAll('[role="option"]').map((o) => o.attributes('data-value'))
    expect(values).toEqual(['created_at', '-created_at', 'title', '-title', 'risk', '-risk'])
    expect(wrapper.text()).toContain('Created (newest first)')
    expect(wrapper.text()).toContain('Title (Z→A)')
    expect(wrapper.text()).toContain('Risk (high → low)')
  })

  it('gives every option an accessible name', () => {
    const wrapper = mountSort('')
    for (const option of wrapper.findAll('[role="option"]')) {
      expect(option.attributes('aria-label') || option.text()).not.toBe('')
    }
    expect(wrapper.find('button[aria-label="Sort by"]').exists()).toBe(true)
  })

  it('emits the API sort string for each direction', () => {
    const wrapper = mountSort('')
    wrapper.findComponent(Select).vm.$emit('update:modelValue', '-title')
    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'title')
    expect(wrapper.emitted('update:modelValue')).toEqual([['-title'], ['title']])
  })

  it('reflects the current value and falls back to the default for unknown values', () => {
    expect(mountSort('-title').findComponent(Select).props('modelValue')).toBe('-title')
    expect(mountSort('-created_at').findComponent(Select).props('modelValue')).toBe('-created_at')
    expect(mountSort('-bogus').findComponent(Select).props('modelValue')).toBe('-created_at')
    expect(mountSort('').findComponent(Select).props('modelValue')).toBe('-created_at')
  })
})
