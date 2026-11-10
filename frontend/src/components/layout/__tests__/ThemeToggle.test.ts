import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  )
})

async function mountToggle() {
  const { default: ThemeToggle } = await import('@/components/layout/ThemeToggle.vue')
  return mount(ThemeToggle)
}

describe('ThemeToggle', () => {
  it('shows the moon and a dark-theme label in light mode', async () => {
    const wrapper = await mountToggle()
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Switch to dark theme')
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(wrapper.find('[data-testid="theme-icon-moon"]').exists()).toBe(true)
  })

  it('shows the sun and a light-theme label after clicking', async () => {
    const wrapper = await mountToggle()
    await wrapper.get('button').trigger('click')
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Switch to light theme')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-testid="theme-icon-sun"]').exists()).toBe(true)
  })
})
