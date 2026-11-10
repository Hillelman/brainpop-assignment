<script setup lang="ts">
import { computed } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SortMeta } from '@/types/api'

const props = defineProps<{ sorts: SortMeta[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const DEFAULT_SORT = '-created_at'

const DIRECTION_LABELS: Record<string, { asc: string; desc: string }> = {
  created_at: { asc: 'oldest first', desc: 'newest first' },
  updated_at: { asc: 'oldest first', desc: 'newest first' },
  title: { asc: 'A→Z', desc: 'Z→A' },
  risk: { asc: 'low → high', desc: 'high → low' },
}

const options = computed(() =>
  props.sorts.flatMap((sort) => {
    const dir = DIRECTION_LABELS[sort.key] ?? { asc: 'ascending', desc: 'descending' }
    return [
      { value: sort.key, label: `${sort.label} (${dir.asc})` },
      { value: `-${sort.key}`, label: `${sort.label} (${dir.desc})` },
    ]
  }),
)

const selected = computed(() =>
  options.value.some((o) => o.value === props.modelValue) ? props.modelValue : DEFAULT_SORT,
)
</script>

<template>
  <Select :model-value="selected" @update:model-value="(v) => emit('update:modelValue', String(v))">
    <SelectTrigger class="w-56" aria-label="Sort by">
      <SelectValue placeholder="Sort by" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="option in options" :key="option.value" :value="option.value">{{
        option.label
      }}</SelectItem>
    </SelectContent>
  </Select>
</template>
