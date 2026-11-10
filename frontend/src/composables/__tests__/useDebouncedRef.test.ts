import { effectScope, nextTick, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedRef } from '@/composables/useDebouncedRef'

function setup(source: Ref<string>) {
  const scope = effectScope()
  const debounced = scope.run(() => useDebouncedRef(source, 300)) ?? ref('')
  return { scope, debounced }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedRef', () => {
  it('updates only after the delay and only once for rapid changes', async () => {
    const source = ref('a')
    const { scope, debounced } = setup(source)

    source.value = 'b'
    await nextTick()
    source.value = 'c'
    await nextTick()
    vi.advanceTimersByTime(299)
    expect(debounced.value).toBe('a')
    vi.advanceTimersByTime(1)
    expect(debounced.value).toBe('c')
    scope.stop()
  })

  it('clears the pending timer when the scope is disposed', async () => {
    const source = ref('a')
    const { scope, debounced } = setup(source)
    source.value = 'b'
    await nextTick()
    scope.stop()
    vi.advanceTimersByTime(500)
    expect(debounced.value).toBe('a')
  })
})
