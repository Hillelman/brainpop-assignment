import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'

describe('router guard', () => {
  it('redirects a signed-out user from /items/5 to sign-in with the redirect param', async () => {
    const router = createAppRouter(
      { isLoaded: ref(true), isSignedIn: ref(false) },
      createMemoryHistory(),
    )
    await router.push('/items/5')
    expect(router.currentRoute.value.path).toBe('/sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/items/5')
  })

  it('waits for Clerk to load, then lets a signed-in user through', async () => {
    const isLoaded = ref(false)
    const router = createAppRouter({ isLoaded, isSignedIn: ref(true) }, createMemoryHistory())
    const navigation = router.push('/items/5')
    isLoaded.value = true
    await navigation
    expect(router.currentRoute.value.fullPath).toBe('/items/5')
  })
})
