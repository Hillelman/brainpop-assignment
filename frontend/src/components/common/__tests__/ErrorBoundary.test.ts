import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'

describe('ErrorBoundary', () => {
  it('renders the fallback when a child throws and re-renders the slot on Retry', async () => {
    let shouldThrow = true
    const Child = defineComponent({
      setup() {
        if (shouldThrow) throw new Error('boom')
        return () => h('p', 'recovered')
      },
    })
    const wrapper = mount(ErrorBoundary, { slots: { default: () => h(Child) } })
    await nextTick()
    expect(wrapper.text()).toContain('Something went wrong')

    shouldThrow = false
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('recovered')
  })
})
