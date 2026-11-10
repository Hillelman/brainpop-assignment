import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useSelection } from '@/composables/useSelection'

describe('useSelection', () => {
  it('toggles single rows', () => {
    const s = useSelection()
    s.toggle(1)
    s.toggle(2)
    expect(s.ids.value).toEqual([1, 2])
    s.toggle(1)
    expect(s.ids.value).toEqual([2])
    expect(s.isSelected(2)).toBe(true)
  })

  it('toggles all on page', () => {
    const s = useSelection()
    s.toggle(9)
    s.toggleAll([1, 2, 3])
    expect(s.allSelected([1, 2, 3])).toBe(true)
    expect(s.count.value).toBe(4)
    s.toggleAll([1, 2, 3])
    expect(s.ids.value).toEqual([9])
  })

  it('clears manually and when the watched source changes', async () => {
    const page = ref(1)
    const s = useSelection(page)
    s.toggle(1)
    s.clear()
    expect(s.count.value).toBe(0)
    s.toggle(2)
    page.value = 2
    await nextTick()
    expect(s.count.value).toBe(0)
  })
})
