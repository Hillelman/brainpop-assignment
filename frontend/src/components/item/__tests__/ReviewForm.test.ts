import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ReviewForm from '@/components/item/ReviewForm.vue'

const bulkReview = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn(), error: vi.fn() }))
vi.mock('@/api/items', () => ({ bulkReview }))
vi.mock('vue-sonner', () => ({ toast }))

const MESSAGE = "You can't review an item you submitted"

function mountForm() {
  return mount(ReviewForm, { props: { itemId: 7, submitterName: 'Ana Lopez' } })
}

function submitDisabled(wrapper: ReturnType<typeof mountForm>): boolean {
  return wrapper.get('button[type="submit"]').attributes('disabled') !== undefined
}

describe('ReviewForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks and explains when the reviewer is the submitter', async () => {
    const wrapper = mountForm()
    await wrapper.get('#review-reviewer-name').setValue('  ana   LOPEZ ')
    expect(wrapper.text()).toContain(MESSAGE)
    expect(submitDisabled(wrapper)).toBe(true)
  })

  it('enables submit for a different name and sends reviewer_name', async () => {
    bulkReview.mockResolvedValue({ updated: [{ id: 7 }], failed: [] })
    const wrapper = mountForm()
    await wrapper.get('#review-reviewer-name').setValue('Rita Reviewer')
    expect(wrapper.text()).not.toContain(MESSAGE)
    expect(submitDisabled(wrapper)).toBe(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(bulkReview).toHaveBeenCalledWith(
      expect.objectContaining({ ids: [7], reviewer_name: 'Rita Reviewer' }),
    )
    expect(wrapper.emitted('reviewed')).toHaveLength(1)
  })

  it('does not call the API for an invalid name', async () => {
    const wrapper = mountForm()
    await wrapper.get('#review-reviewer-name').setValue('a')
    await wrapper.get('form').trigger('submit')
    expect(bulkReview).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="error-reviewer-name"]').text()).toContain('at least 2')
  })

  it('shows the same inline message when the server returns same_person', async () => {
    bulkReview.mockResolvedValue({ updated: [], failed: [{ id: 7, reason: 'same_person' }] })
    const wrapper = mountForm()
    await wrapper.get('#review-reviewer-name').setValue('Rita Reviewer')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(MESSAGE)
    expect(toast.error).not.toHaveBeenCalled()
    expect(wrapper.emitted('reviewed')).toBeUndefined()
    await wrapper.get('#review-reviewer-name').setValue('Someone Else')
    expect(wrapper.text()).not.toContain(MESSAGE)
    expect(submitDisabled(wrapper)).toBe(false)
  })
})
