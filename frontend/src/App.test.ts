import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import QueueView from '@/views/QueueView.vue'

vi.mock('@/api/items', () => ({
  listItems: () =>
    Promise.resolve({
      data: [],
      meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 },
    }),
  searchItems: vi.fn(),
  getFilters: () => Promise.resolve({ filters: [], sorts: [] }),
  bulkReview: vi.fn(),
}))

describe('App', () => {
  it('mounts the layout and renders the routed view', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: QueueView }],
    })
    await router.push('/')
    const wrapper = mount(App, {
      global: { plugins: [router, createPinia()], stubs: { UserButton: true } },
    })
    expect(wrapper.text()).toContain('Review Queue')
    expect(wrapper.text()).toContain('Submit')
  })
})
