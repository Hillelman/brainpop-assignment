import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

describe('AppLayout', () => {
  it('places the theme toggle last in the header row', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(AppLayout, { global: { plugins: [router] } })
    const row = wrapper.get('header > div').element
    const last = row.lastElementChild
    expect(last?.tagName).toBe('BUTTON')
    expect(last?.getAttribute('aria-label')).toMatch(/Switch to (dark|light) theme/)
  })
})
