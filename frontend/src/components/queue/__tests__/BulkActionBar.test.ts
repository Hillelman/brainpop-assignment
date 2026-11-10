import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@/api/http'
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

async function enterName(wrapper: ReturnType<typeof mount>, name = 'Rita Reviewer') {
  await wrapper.get('input[aria-label="Reviewer name"]').setValue(name)
}

describe('BulkActionBar', () => {
  it('submits the payload for pending items only', async () => {
    bulkReview.mockResolvedValue({ updated: [pending, pending2], failed: [] })
    const wrapper = mount(BulkActionBar, { props: { items: [pending, pending2, reviewed] } })
    expect(wrapper.get('[data-test="skip-warning"]').text()).toContain('1 already reviewed')
    await enterName(wrapper)
    await wrapper.get('textarea').setValue('  looks fine ')
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()
    expect(bulkReview).toHaveBeenCalledWith({
      ids: [1, 2],
      decision: 'approved',
      risk: null,
      note: 'looks fine',
      reviewer_name: 'Rita Reviewer',
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
    await enterName(wrapper)
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
    await enterName(wrapper)
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()
    expect(toast.error).toHaveBeenCalled()
    expect(wrapper.emitted('completed')).toBeUndefined()
  })

  it.each(['', '   ', 'a', 'x'.repeat(61)])(
    'keeps Approve/Reject disabled for the invalid reviewer name %j',
    async (name) => {
      const wrapper = mount(BulkActionBar, { props: { items: [pending] } })
      await enterName(wrapper, name)
      expect(wrapper.get('[data-test="approve"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-test="reject"]').attributes('disabled')).toBeDefined()
      expect(bulkReview).not.toHaveBeenCalled()
    },
  )

  it('enables the actions once the reviewer name is valid', async () => {
    const wrapper = mount(BulkActionBar, { props: { items: [pending] } })
    expect(wrapper.get('[data-test="approve"]').attributes('disabled')).toBeDefined()
    await enterName(wrapper)
    expect(wrapper.get('[data-test="approve"]').attributes('disabled')).toBeUndefined()
  })

  it('reports same_person skips and still completes', async () => {
    bulkReview.mockResolvedValue({ updated: [], failed: [{ id: 1, reason: 'same_person' }] })
    const wrapper = mount(BulkActionBar, { props: { items: [pending] } })
    await enterName(wrapper)
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()
    expect(toast.warning).toHaveBeenCalledWith('1 skipped: you submitted them')
    expect(toast.success).not.toHaveBeenCalled()
    expect(wrapper.emitted('completed')).toHaveLength(1)
  })

  it('shows a 422 on reviewer_name inline and does not complete', async () => {
    bulkReview.mockRejectedValue(
      new ApiError(422, 'validation_failed', 'x', { reviewer_name: ['Name is bad.'] }),
    )
    const wrapper = mount(BulkActionBar, { props: { items: [pending] } })
    await enterName(wrapper)
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="error-reviewer-name"]').text()).toBe('Name is bad.')
    expect(toast.error).not.toHaveBeenCalled()
    expect(wrapper.emitted('completed')).toBeUndefined()
  })
})
