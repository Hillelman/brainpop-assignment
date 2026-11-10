import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BulkActionBar from '@/components/queue/BulkActionBar.vue'
import type { Item } from '@/types/api'

const bulkReview = vi.fn()
vi.mock('@/api/items', () => ({ bulkReview: (...a: unknown[]) => bulkReview(...a) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast }))

const pending = { id: 1, status: 'pending' } as Item
const pending2 = { id: 2, status: 'pending' } as Item
const reviewed = { id: 3, status: 'approved' } as Item

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BulkActionBar', () => {
  it('submits the payload for pending items only', async () => {
    bulkReview.mockResolvedValue({ updated: [pending, pending2], failed: [] })
    const wrapper = mount(BulkActionBar, { props: { items: [pending, pending2, reviewed] } })
    expect(wrapper.get('[data-test="skip-warning"]').text()).toContain('1 already reviewed')
    await wrapper.get('textarea').setValue('  looks fine ')
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()
    expect(bulkReview).toHaveBeenCalledWith({
      ids: [1, 2],
      decision: 'approved',
      risk: null,
      note: 'looks fine',
    })
    expect(toast.success).toHaveBeenCalledWith('2 reviewed')
    expect(wrapper.emitted('completed')).toHaveLength(1)
  })

  it('warns on partial failure and signals completion so selection clears', async () => {
    bulkReview.mockResolvedValue({
      updated: [pending],
      failed: [
        { id: 2, reason: 'already_reviewed' },
        { id: 4, reason: 'not_found' },
      ],
    })
    const wrapper = mount(BulkActionBar, { props: { items: [pending, pending2] } })
    await wrapper.get('[data-test="reject"]').trigger('click')
    await flushPromises()
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('1 already reviewed, 1 not found'),
    )
    expect(wrapper.emitted('completed')).toHaveLength(1)
  })

  it('disables actions with no pending items and toasts errors without completing', async () => {
    const none = mount(BulkActionBar, { props: { items: [reviewed] } })
    expect(none.get('[data-test="approve"]').attributes('disabled')).toBeDefined()

    bulkReview.mockRejectedValue(new Error('x'))
    const wrapper = mount(BulkActionBar, { props: { items: [pending] } })
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()
    expect(toast.error).toHaveBeenCalled()
    expect(wrapper.emitted('completed')).toBeUndefined()
  })
})
