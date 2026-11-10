import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import QueueView from '@/views/QueueView.vue'

describe('App', () => {
  it('mounts the layout and renders the routed view', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: QueueView }],
    })
    await router.push('/')
    const wrapper = mount(App, {
      global: { plugins: [router], stubs: { UserButton: true } },
    })
    expect(wrapper.text()).toContain('Review Queue')
    expect(wrapper.text()).toContain('Submit')
  })
})
