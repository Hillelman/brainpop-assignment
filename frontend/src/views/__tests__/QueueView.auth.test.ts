import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { ref } from 'vue'
import { RouterView, createMemoryHistory } from 'vue-router'
import { setTokenProvider, setUnauthorizedHandler } from '@/api/http'
import { createUnauthorizedHandler } from '@/lib/authRecovery'
import { createAppRouter } from '@/router'

const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function calls(fragment: string): number {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes(fragment)).length
}

async function setup(signedIn: boolean) {
  const auth = { isLoaded: ref(true), isSignedIn: ref(signedIn) }
  const router = createAppRouter(auth, createMemoryHistory())
  setTokenProvider(() => Promise.resolve('tok'))
  setUnauthorizedHandler(createUnauthorizedHandler(auth, router))
  await router.push('/items')
  const pinia = createPinia()
  const mountQueue = () => mount(RouterView, { global: { plugins: [router, pinia] } })
  return { router, mountQueue }
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/api')
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('QueueView with API 401 inside the real router', () => {
  it('does not loop or navigate when Clerk is signed in', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(401, { message: 'No', code: 'unauthenticated' })),
    )
    const { router, mountQueue } = await setup(true)
    const wrapper = mountQueue()
    await flushPromises()
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('queue')
    expect(calls('/items?')).toBe(1)
    expect(calls('/items/filters')).toBeLessThanOrEqual(1)
    expect(wrapper.get('[data-test="list-error"]').text()).toContain(
      'The server rejected your session',
    )
  })

  it('makes one filters request across two mounts after a failure, until retry', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(503, { message: 'x', code: 'server_error' })),
    )
    const { mountQueue } = await setup(true)
    mountQueue().unmount()
    await flushPromises()
    const second = mountQueue()
    await flushPromises()
    expect(calls('/items/filters')).toBe(1)

    const retry = second
      .findAll('button')
      .find((b) => b.text() === 'Retry' && b.element.closest('[data-test="list-error"]') === null)
    await retry?.trigger('click')
    await flushPromises()
    expect(calls('/items/filters')).toBe(2)
  })

  it('shows the backend-not-configured state with Retry that refetches once', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(503, {
          message: 'x',
          code: 'auth_not_configured',
          errors: { missing: ['CLERK_JWKS_URL'] },
        }),
      ),
    )
    const { router, mountQueue } = await setup(true)
    const wrapper = mountQueue()
    await flushPromises()
    const alert = wrapper.get('[data-test="list-error"]')
    expect(alert.text()).toContain('The backend is not configured: missing CLERK_JWKS_URL')
    expect(router.currentRoute.value.name).toBe('queue')
    expect(calls('/items?')).toBe(1)
    await alert.get('button').trigger('click')
    await flushPromises()
    expect(calls('/items?')).toBe(2)
  })
})
