<script setup lang="ts">
import { computed, useId } from 'vue'
import FilterControl from '@/components/queue/FilterControl.vue'
import type { FilterMeta } from '@/types/api'

interface FilterGroup {
  key: string
  label: string
  filters: FilterMeta[]
}

const props = defineProps<{
  filters: FilterMeta[]
  modelValue: Record<string, string>
}>()

const uid = useId()

const emit = defineEmits<{ 'update:modelValue': [value: Record<string, string>] }>()

const ungrouped = computed(() => props.filters.filter((f) => !f.group))

const groups = computed<FilterGroup[]>(() => {
  const byKey = new Map<string, FilterGroup>()
  for (const filter of props.filters) {
    if (!filter.group) continue
    let group = byKey.get(filter.group)
    if (!group) {
      group = { key: filter.group, label: filter.group_label || filter.group, filters: [] }
      byKey.set(filter.group, group)
    }
    group.filters.push(filter)
  }
  return [...byKey.values()]
})

function setFilter(key: string, value: string | undefined): void {
  const next = { ...props.modelValue }
  if (!value) delete next[key]
  else next[key] = value
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="flex flex-col gap-3" data-test="filter-controls">
    <div class="flex flex-wrap items-center gap-2" data-test="filter-row">
      <FilterControl
        v-for="filter in ungrouped"
        :key="filter.key"
        :filter="filter"
        :value="modelValue[filter.key]"
        :accessible-name="filter.label"
        @change="(v) => setFilter(filter.key, v)"
      />
    </div>
    <div
      v-for="group in groups"
      :key="group.key"
      role="group"
      :aria-labelledby="`${uid}-${group.key}`"
      class="flex flex-col gap-1 md:flex-row md:items-center md:gap-2"
      data-test="filter-group"
    >
      <span
        :id="`${uid}-${group.key}`"
        class="text-sm font-medium md:w-28 md:shrink-0"
        data-test="filter-group-label"
      >
        {{ group.label }}
      </span>
      <div class="flex flex-wrap items-center gap-2">
        <FilterControl
          v-for="filter in group.filters"
          :key="filter.key"
          :filter="filter"
          :value="modelValue[filter.key]"
          :accessible-name="`${group.label} ${filter.label.toLowerCase()}`"
          @change="(v) => setFilter(filter.key, v)"
        />
      </div>
    </div>
  </div>
</template>
