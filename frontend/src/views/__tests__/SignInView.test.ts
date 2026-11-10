import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SignInView from '@/views/SignInView.vue'

vi.mock('@clerk/vue', () => ({
  SignIn: defineComponent({
    name: 'SignIn',
    props: { forceRedirectUrl: { type: String, default: '' } },
    template: '<div data-test="sign-in" :data-redirect="forceRedirectUrl" />',
  }),
}))

async function redirectFor(query: string): Promise<string | undefined> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/sign-in', component: SignInView }],
  })
  await router.push(`/sign-in${query}`)
  await router.isReady()
  const wrapper = mount(SignInView, { global: { plugins: [router] } })
  return wrapper.get('[data-test="sign-in"]').attributes('data-redirect')
}

describe('SignInView redirect (deep links)', () => {
  it('returns to the original deep link', async () => {
    expect(await redirectFor('?redirect=/items/42')).toBe('/items/42')
  })

  it('falls back to /items without a redirect', async () => {
    expect(await redirectFor('')).toBe('/items')
  })

  it.each(['https://evil.com', '//evil.com', 'items/42'])('rejects %s', async (value) => {
    expect(await redirectFor(`?redirect=${encodeURIComponent(value)}`)).toBe('/items')
  })
})
