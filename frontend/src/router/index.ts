import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'

export function createAppRouter(history: RouterHistory = createWebHistory()) {
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
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
      },
    ],
  })

  return router
}
