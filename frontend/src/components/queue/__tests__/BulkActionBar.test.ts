import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@/api/http'
import BulkActionBar from '@/components/queue/BulkActionBar.vue'
import type { Item } from '@/types/api'

const bulkReview = vi.fn()
vi.mock('@/api/items', () => ({ bulkReview: (...a: unknown[]) => bulkReview(...a) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast }))

function makeItem(
  id: number,
  status: Item['status'],
  submitter = 'Sam Submitter',
  title = `Item ${id}`,
) {
  return { id, status, title, submitter: { name: submitter } } as Item
}

const pending = makeItem(1, 'pending')
const pending2 = makeItem(2, 'pending')
const reviewed = makeItem(3, 'approved')

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

  it('shows the inline error for server same_person failures instead of a toast', async () => {
    bulkReview.mockResolvedValue({ updated: [], failed: [{ id: 1, reason: 'same_person' }] })
    const wrapper = mount(BulkActionBar, { props: { items: [pending] } })
    await enterName(wrapper)
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'You submitted “Item 1”. Deselect it or use a different name.',
    )
    expect(toast.warning).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="approve"]').attributes('disabled')).toBeDefined()
    await enterName(wrapper, 'Other Person')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('still toasts already_reviewed alongside a same_person failure', async () => {
    bulkReview.mockResolvedValue({
      updated: [pending2],
      failed: [
        { id: 1, reason: 'same_person' },
        { id: 4, reason: 'already_reviewed' },
      ],
    })
    const wrapper = mount(BulkActionBar, { props: { items: [pending, pending2] } })
    await enterName(wrapper)
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()
    expect(toast.warning).toHaveBeenCalledWith('1 already reviewed')
    expect(wrapper.emitted('completed')).toHaveLength(1)
  })

  describe('self-review conflicts', () => {
    const own = makeItem(10, 'pending', 'Ana Lopez', 'My doc')

    it('shows the inline error and disables the actions', async () => {
      const wrapper = mount(BulkActionBar, { props: { items: [own, pending] } })
      await enterName(wrapper, 'Ana Lopez')
      const alert = wrapper.get('[role="alert"]')
      expect(alert.text()).toBe('You submitted “My doc”. Deselect it or use a different name.')
      const input = wrapper.get('input[aria-label="Reviewer name"]')
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.attributes('aria-describedby')).toBe(alert.attributes('id'))
      expect(wrapper.get('[data-test="approve"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-test="reject"]').attributes('disabled')).toBeDefined()
    })

    it('lists at most 3 titles and counts the rest', async () => {
      const items = [1, 2, 3, 4, 5].map((n) => makeItem(20 + n, 'pending', 'Ana Lopez', `T${n}`))
      const wrapper = mount(BulkActionBar, { props: { items } })
      await enterName(wrapper, 'Ana Lopez')
      expect(wrapper.get('[role="alert"]').text()).toBe(
        'You submitted 5 of the selected items: “T1”, “T2”, “T3” and 2 more… Deselect them or use a different name.',
      )
    })

    it('matches after normalization but not across accents', async () => {
      const wrapper = mount(BulkActionBar, { props: { items: [own] } })
      await enterName(wrapper, '  ana   LOPEZ ')
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      const accented = mount(BulkActionBar, {
        props: { items: [makeItem(11, 'pending', 'Jose Diaz')] },
      })
      await enterName(accented, 'José Diaz')
      expect(accented.find('[role="alert"]').exists()).toBe(false)
      expect(accented.get('[data-test="approve"]').attributes('disabled')).toBeUndefined()
    })

    it('clears when the conflicting item is deselected', async () => {
      const wrapper = mount(BulkActionBar, { props: { items: [own, pending] } })
      await enterName(wrapper, 'Ana Lopez')
      await wrapper.setProps({ items: [pending] })
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="approve"]').attributes('disabled')).toBeUndefined()
    })

    it('shows no conflict message while the name is invalid', async () => {
      const wrapper = mount(BulkActionBar, { props: { items: [makeItem(12, 'pending', 'A')] } })
      await enterName(wrapper, 'A')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('renders HTML in titles as literal text', async () => {
      const html = makeItem(13, 'pending', 'Ana Lopez', '<b>x</b>')
      const wrapper = mount(BulkActionBar, { props: { items: [html] } })
      await enterName(wrapper, 'Ana Lopez')
      expect(wrapper.get('[role="alert"]').text()).toContain('“<b>x</b>”')
      expect(wrapper.find('[role="alert"] b').exists()).toBe(false)
    })
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
