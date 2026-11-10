import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import SubmitItemForm from '@/components/item/SubmitItemForm.vue'

const api = vi.hoisted(() => ({ createItem: vi.fn() }))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/api/items', () => api)
vi.mock('vue-sonner', () => ({ toast: toastMock }))

async function mountForm() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/items/new', component: SubmitItemForm },
      { path: '/items/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/items/new')
  await router.isReady()
  const wrapper = mount(SubmitItemForm, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('SubmitItemForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks a 2-char title and a 5001-char description', async () => {
    const { wrapper } = await mountForm()
    await wrapper.get('#submitter-name').setValue('Ana Lopez')
    await wrapper.get('#item-title').setValue('ab')
    await wrapper.get('#item-description').setValue('x'.repeat(5001))
    await wrapper.get('form').trigger('submit')
    expect(api.createItem).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="error-title"]').text()).toContain('at least 3')
    expect(wrapper.get('[data-test="error-description"]').text()).toContain('5000')
  })

  it.each(['', '   ', 'a'])('blocks submit with the name %j and shows the error', async (name) => {
    const { wrapper } = await mountForm()
    await wrapper.get('#submitter-name').setValue(name)
    await wrapper.get('#item-title').setValue('Valid title')
    await wrapper.get('#item-description').setValue('desc')
    await wrapper.get('form').trigger('submit')
    expect(api.createItem).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="error-submitter-name"]').text()).toContain('at least 2')
  })

  it('blocks a 61-char name', async () => {
    const { wrapper } = await mountForm()
    await wrapper.get('#submitter-name').setValue('x'.repeat(61))
    await wrapper.get('#item-title').setValue('Valid title')
    await wrapper.get('#item-description').setValue('desc')
    await wrapper.get('form').trigger('submit')
    expect(api.createItem).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="error-submitter-name"]').text()).toContain('at most 60')
  })

  it.each(['', '   ', 'A'])('blocks submit with the invalid name %j', async (name) => {
    const { wrapper } = await mountForm()
    await wrapper.get('#submitter-name').setValue(name)
    await wrapper.get('#item-title').setValue('Valid title')
    await wrapper.get('#item-description').setValue('desc')
    await wrapper.get('form').trigger('submit')
    expect(api.createItem).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="error-submitter-name"]').exists()).toBe(true)
  })

  it('sends the cleaned name and starts blank', async () => {
    api.createItem.mockResolvedValue({ id: 1 })
    const { wrapper } = await mountForm()
    expect((wrapper.get('#submitter-name').element as HTMLInputElement).value).toBe('')
    await wrapper.get('#submitter-name').setValue('  Ana   Lopez ')
    await wrapper.get('#item-title').setValue('Valid title')
    await wrapper.get('#item-description').setValue('desc')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ submitter_name: 'Ana Lopez' }),
    )
  })

  it('rejects a whitespace-only title', async () => {
    const { wrapper } = await mountForm()
    await wrapper.get('#submitter-name').setValue('Ana Lopez')
    await wrapper.get('#item-title').setValue('     ')
    await wrapper.get('#item-description').setValue('desc')
    await wrapper.get('form').trigger('submit')
    expect(api.createItem).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="error-title"]').exists()).toBe(true)
  })

  it('maps server 422 field errors under the fields', async () => {
    api.createItem.mockRejectedValue(
      new ApiError(422, 'validation_failed', 'invalid', {
        title: ['Title is taken.'],
        description: ['Description is bad.'],
        submitter_name: ['Name is bad.'],
      }),
    )
    const { wrapper } = await mountForm()
    await wrapper.get('#submitter-name').setValue('Ana Lopez')
    await wrapper.get('#item-title').setValue('Valid title')
    await wrapper.get('#item-description').setValue('desc')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-test="error-title"]').text()).toBe('Title is taken.')
    expect(wrapper.get('[data-test="error-description"]').text()).toBe('Description is bad.')
    expect(wrapper.get('[data-test="error-submitter-name"]').text()).toBe('Name is bad.')
  })

  it('navigates to the new item after success', async () => {
    api.createItem.mockResolvedValue({ id: 42 })
    const { wrapper, router } = await mountForm()
    await wrapper.get('#submitter-name').setValue('Ana Lopez')
    await wrapper.get('#item-title').setValue('Valid title')
    await wrapper.get('#item-description').setValue('desc')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.createItem).toHaveBeenCalledWith({
      title: 'Valid title',
      description: 'desc',
      submitter_name: 'Ana Lopez',
    })
    expect(router.currentRoute.value.fullPath).toBe('/items/42')
  })

  it('shows a non-validation failure inline with Retry, without navigating', async () => {
    api.createItem.mockRejectedValueOnce(new ApiError(500, 'server_error', 'x'))
    api.createItem.mockResolvedValueOnce({ id: 9 })
    const { wrapper, router } = await mountForm()
    await wrapper.get('#submitter-name').setValue('Ana Lopez')
    await wrapper.get('#item-title').setValue('Valid title')
    await wrapper.get('#item-description').setValue('Some text')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-test="submit-error"]').text()).toContain(
      'Something went wrong on our side',
    )
    expect(router.currentRoute.value.path).toBe('/items/new')
    await wrapper.get('[data-test="submit-error"] button').trigger('click')
    await flushPromises()
    expect(api.createItem).toHaveBeenCalledTimes(2)
    expect(router.currentRoute.value.path).toBe('/items/9')
  })
})
