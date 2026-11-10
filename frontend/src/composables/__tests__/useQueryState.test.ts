import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useQueryState } from '@/composables/useQueryState'

async function setup(url: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/items', component: { template: '<div />' } }],
  })
  await router.push(url)
  let api!: ReturnType<typeof useQueryState>
  mount(
    defineComponent({
      setup() {
        api = useQueryState()
        return () => h('div')
      },
    }),
    { global: { plugins: [router] } },
  )
  await flushPromises()
  return { router, api }
}

describe('useQueryState', () => {
  it('reads initial state from the URL', async () => {
    const { api } = await setup('/items?q=foo&sort=title&page=3&perPage=50&filter[risk]=high')
    expect(api.query.value).toEqual({
      q: 'foo',
      filter: { risk: 'high' },
      sort: 'title',
      page: 3,
      perPage: 50,
    })
  })

  it('normalises invalid values to defaults', async () => {
    const { api, router } = await setup('/items?page=abc&perPage=7')
    expect(api.query.value.page).toBe(1)
    expect(api.query.value.perPage).toBe(25)
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('does not read or write state and drops it from the URL', async () => {
    const { api, router } = await setup('/items?state=reviewed&q=foo')
    expect(api.query.value).not.toHaveProperty('state')
    expect(router.currentRoute.value.query).toEqual({ q: 'foo' })
    await api.update({ page: 2 })
    expect(router.currentRoute.value.query).toEqual({ q: 'foo', page: '2' })
  })

  it('writes changes back and resets page when a filter changes', async () => {
    const { api, router } = await setup('/items?page=4')
    await api.update({ filter: { risk: 'low' } })
    expect(router.currentRoute.value.query).toEqual({ 'filter[risk]': 'low' })
    expect(api.query.value.page).toBe(1)
    await api.update({ page: 2 })
    expect(router.currentRoute.value.query.page).toBe('2')
    expect(api.query.value.filter).toEqual({ risk: 'low' })
  })

  it('replaces history while typing', async () => {
    const { api, router } = await setup('/items')
    const before = router.options.history.state.position as number
    await api.update({ q: 'a' })
    await api.update({ q: 'ab' })
    expect(router.options.history.state.position).toBe(before)
    expect(router.currentRoute.value.query.q).toBe('ab')
  })
})
