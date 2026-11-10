import { computed, ref, watch, type WatchSource } from 'vue'

export function useSelection(clearOn?: WatchSource) {
  const selected = ref<Set<number>>(new Set())

  const ids = computed(() => [...selected.value])
  const count = computed(() => selected.value.size)

  function isSelected(id: number): boolean {
    return selected.value.has(id)
  }

  function toggle(id: number): void {
    const next = new Set(selected.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selected.value = next
  }

  function allSelected(pageIds: number[]): boolean {
    return pageIds.length > 0 && pageIds.every((id) => selected.value.has(id))
  }

  function toggleAll(pageIds: number[]): void {
    const next = new Set(selected.value)
    if (allSelected(pageIds)) pageIds.forEach((id) => next.delete(id))
    else pageIds.forEach((id) => next.add(id))
    selected.value = next
  }

  function clear(): void {
    selected.value = new Set()
  }

  if (clearOn) watch(clearOn, clear)

  return { selected, ids, count, isSelected, toggle, toggleAll, allSelected, clear }
}
