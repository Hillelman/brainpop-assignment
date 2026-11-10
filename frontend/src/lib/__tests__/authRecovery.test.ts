import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createUnauthorizedHandler } from '@/lib/authRecovery'

async function setup(signedIn: boolean, path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/items', name: 'queue', component: { template: '<div />' } },
      { path: '/sign-in', name: 'sign-in', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const handler = createUnauthorizedHandler({ isSignedIn: ref(signedIn) }, router)
  return { router, handler }
}

describe('createUnauthorizedHandler', () => {
  it('redirects to sign-in with a redirect param when signed out', async () => {
    const { router, handler } = await setup(false, '/items')
    expect(handler()).toBe('redirected')
    await new Promise((r) => setTimeout(r))
    expect(router.currentRoute.value.fullPath).toBe('/sign-in?redirect=/items')
  })

  it('does nothing when signed in', async () => {
    const { router, handler } = await setup(true, '/items')
    expect(handler()).toBe('rejected')
    await new Promise((r) => setTimeout(r))
    expect(router.currentRoute.value.name).toBe('queue')
  })

  it('does not push again when already on sign-in', async () => {
    const { router, handler } = await setup(false, '/sign-in')
    handler()
    await new Promise((r) => setTimeout(r))
    expect(router.currentRoute.value.fullPath).toBe('/sign-in')
  })
})
