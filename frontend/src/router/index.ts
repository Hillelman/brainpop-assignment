import { watch, type Ref } from 'vue'
import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'

export interface AuthState {
  isLoaded: Readonly<Ref<boolean | undefined>>
  isSignedIn: Readonly<Ref<boolean | undefined>>
}

function whenLoaded(auth: AuthState): Promise<void> {
  if (auth.isLoaded.value) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(
      auth.isLoaded,
      (loaded) => {
        if (loaded) {
          stop()
          resolve()
        }
      },
      { flush: 'sync' },
    )
  })
}

export function createAppRouter(auth: AuthState, history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', redirect: '/items' },
      {
        path: '/items',
        name: 'queue',
        component: () => import('@/views/QueueView.vue'),
      },
      {
        path: '/items/new',
        name: 'submit',
        component: () => import('@/views/SubmitItemView.vue'),
      },
      {
        path: '/items/:id(\\d+)',
        name: 'item-detail',
        component: () => import('@/views/ItemDetailView.vue'),
        props: true,
      },
      {
        path: '/sign-in/:pathMatch(.*)*',
        name: 'sign-in',
        component: () => import('@/views/SignInView.vue'),
        meta: { public: true },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
      },
    ],
  })

  router.beforeEach(async (to) => {
    await whenLoaded(auth)
    if (to.meta.public) return true
    if (!auth.isSignedIn.value) {
      return { path: '/sign-in', query: { redirect: to.fullPath } }
    }
    return true
  })

  return router
}
