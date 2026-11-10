import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import ItemDetailView from '@/views/ItemDetailView.vue'
import type { Item, Review } from '@/types/api'

const api = vi.hoisted(() => ({
  getItem: vi.fn(),
  getItemReviews: vi.fn(),
  bulkReview: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@/api/items', () => api)
vi.mock('vue-sonner', () => ({ toast: toastMock }))

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 7,
    title: 'Logo update',
    description: 'New logo for the site',
    status: 'pending',
    risk: null,
    submitter: { id: 1, name: 'Alice' },
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    latest_review: null,
    ...overrides,
  }
}

const review: Review = {
  id: 1,
  decision: 'approved',
  risk: 'low',
  note: 'fine',
  reviewer: { id: 2, name: 'Bob' },
  created_at: '2026-01-02T10:00:00Z',
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/items', component: { template: '<div />' } },
      { path: '/items/:id', component: ItemDetailView, props: true },
    ],
  })
  await router.push('/items/7')
  await router.isReady()
  return mount(ItemDetailView, { props: { id: '7' }, global: { plugins: [router] } })
}

describe('ItemDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getItemReviews.mockResolvedValue({
      data: [],
      meta: { current_page: 1, per_page: 5, total: 0, last_page: 1 },
    })
  })

  it('shows the skeleton, then the item details', async () => {
    let resolve: (item: Item) => void = () => {}
    api.getItem.mockReturnValue(new Promise<Item>((r) => (resolve = r)))
    const wrapper = await mountView()
    expect(wrapper.find('[data-test="item-skeleton"]').exists()).toBe(true)
    resolve(makeItem({ status: 'approved', risk: 'high' }))
    await flushPromises()
    expect(wrapper.find('[data-test="item-skeleton"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Logo update')
    expect(wrapper.text()).toContain('New logo for the site')
    expect(wrapper.text()).toContain('Approved')
    expect(wrapper.text()).toContain('High')
    expect(wrapper.get('[data-test="item-submitter"]').text()).toBe('Alice')
  })

  it('shows ItemNotFound on a 404', async () => {
    api.getItem.mockRejectedValue(new ApiError(404, 'not_found', 'nope'))
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Item not found')
  })

  it('shows an inline error on 500 and Retry refetches', async () => {
    api.getItem.mockRejectedValueOnce(new ApiError(500, 'server_error', 'boom'))
    api.getItem.mockResolvedValueOnce(makeItem())
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.find('[data-test="item-error"]').exists()).toBe(true)
    const retry = wrapper.findAll('button').find((b) => b.text() === 'Retry')
    await retry?.trigger('click')
    await flushPromises()
    expect(api.getItem).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Logo update')
  })

  it('shows the form for pending items and the outcome for reviewed ones', async () => {
    api.getItem.mockResolvedValue(makeItem())
    const pending = await mountView()
    await flushPromises()
    expect(pending.find('[data-test="review-form"]').exists()).toBe(true)

    api.getItem.mockResolvedValue(
      makeItem({ status: 'approved', risk: 'low', latest_review: review }),
    )
    const reviewed = await mountView()
    await flushPromises()
    expect(reviewed.find('[data-test="review-form"]').exists()).toBe(false)
    expect(reviewed.get('[data-test="item-outcome"]').text()).toContain('Bob')
  })

  it('submits the review through bulkReview and refreshes', async () => {
    api.getItem.mockResolvedValue(makeItem())
    api.bulkReview.mockResolvedValue({ updated: [makeItem({ status: 'rejected' })], failed: [] })
    const wrapper = await mountView()
    await flushPromises()
    await wrapper.get('#review-reviewer-name').setValue('Rita Reviewer')
    await wrapper.get('input[value="rejected"]').setValue(true)
    await wrapper.get('#review-risk').setValue('high')
    await wrapper.get('#review-note').setValue('bad')
    await wrapper.get('[data-test="review-form"]').trigger('submit')
    await flushPromises()
    expect(api.bulkReview).toHaveBeenCalledWith({
      ids: [7],
      decision: 'rejected',
      risk: 'high',
      note: 'bad',
      reviewer_name: 'Rita Reviewer',
    })
    expect(toastMock.success).toHaveBeenCalled()
    expect(api.getItem).toHaveBeenCalledTimes(2)
  })

  it('handles already_reviewed gracefully', async () => {
    api.getItem.mockResolvedValue(makeItem())
    api.bulkReview.mockResolvedValue({
      updated: [],
      failed: [{ id: 7, reason: 'already_reviewed' }],
    })
    const wrapper = await mountView()
    await flushPromises()
    await wrapper.get('#review-reviewer-name').setValue('Rita Reviewer')
    await wrapper.get('[data-test="review-form"]').trigger('submit')
    await flushPromises()
    expect(toastMock.info).toHaveBeenCalledWith('Already reviewed by someone else')
    expect(api.getItem).toHaveBeenCalledTimes(2)
    expect(toastMock.error).not.toHaveBeenCalled()
  })
})
