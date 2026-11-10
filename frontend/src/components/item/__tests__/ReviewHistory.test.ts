import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReviewHistory from '@/components/item/ReviewHistory.vue'
import type { Review } from '@/types/api'

const reviews: Review[] = [
  {
    id: 1,
    decision: 'approved',
    risk: 'low',
    note: 'looks fine',
    reviewer: { id: 2, name: 'Bob' },
    created_at: '2026-01-02T10:00:00Z',
  },
  {
    id: 2,
    decision: 'rejected',
    risk: null,
    note: null,
    reviewer: { id: 3, name: 'Cara' },
    created_at: '2026-01-03T10:00:00Z',
  },
]

describe('ReviewHistory', () => {
  it('renders reviews and emits load-more', async () => {
    const wrapper = mount(ReviewHistory, {
      props: { reviews, loading: false, hasMore: true },
    })
    expect(wrapper.findAll('[data-test="review-entry"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('looks fine')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('load-more')).toHaveLength(1)
  })

  it('renders an empty state when there are no reviews', () => {
    const wrapper = mount(ReviewHistory, {
      props: { reviews: [], loading: false, hasMore: false },
    })
    expect(wrapper.text()).toContain('No reviews yet')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
