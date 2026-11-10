import type { Ref } from 'vue'
import type { Router } from 'vue-router'
import type { UnauthorizedOutcome } from '@/api/http'

interface SignedInState {
  isSignedIn: Readonly<Ref<boolean | undefined>>
}

/**
 * Redirect to sign-in only when Clerk reports signed out. While signed in, a 401
 * means the server rejected a valid session, and redirecting would loop.
 */
export function createUnauthorizedHandler(
  auth: SignedInState,
  router: Router,
): () => UnauthorizedOutcome {
  return () => {
    if (auth.isSignedIn.value) return 'rejected'
    const current = router.currentRoute.value
    if (current.name !== 'sign-in') {
      void router.push({ path: '/sign-in', query: { redirect: current.fullPath } })
    }
    return 'redirected'
  }
}
