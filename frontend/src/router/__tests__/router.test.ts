import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { RouterView, createMemoryHistory } from 'vue-router'
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

async function setup(path: string) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  const pinia = createPinia()
  const mountApp = () => mount(RouterView, { global: { plugins: [router, pinia] } })
  return { router, mountApp }
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/api')
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('app router without auth', () => {
  it('opens /items directly', async () => {
    const { router } = await setup('/items')
    expect(router.currentRoute.value.name).toBe('queue')
  })

  it.each(['/sign-in', '/sign-in/factor-one'])('renders NotFound for %s', async (path) => {
    const { router, mountApp } = await setup(path)
    mountApp()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('not-found')
    expect(router.currentRoute.value.fullPath).toBe(path)
  })
})

describe('QueueView inside the real router', () => {
  it('makes one filters request across two mounts after a failure, until retry', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(503, { message: 'x', code: 'server_error' })),
    )
    const { mountApp } = await setup('/items')
    mountApp().unmount()
    await flushPromises()
    const second = mountApp()
    await flushPromises()
    expect(calls('/items/filters')).toBe(1)

    const retry = second
      .findAll('button')
      .find((b) => b.text() === 'Retry' && b.element.closest('[data-test="list-error"]') === null)
    await retry?.trigger('click')
    await flushPromises()
    expect(calls('/items/filters')).toBe(2)
  })
})
