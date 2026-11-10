<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SortMeta } from '@/types/api'

defineProps<{ sorts: SortMeta[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const DEFAULT = '__default__'
</script>

<template>
  <Select
    :model-value="modelValue || DEFAULT"
    @update:model-value="(v) => emit('update:modelValue', v === DEFAULT ? '' : String(v))"
  >
    <SelectTrigger class="w-44" aria-label="Sort by">
      <SelectValue placeholder="Sort by" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem :value="DEFAULT">Default order</SelectItem>
      <SelectItem v-for="sort in sorts" :key="sort.key" :value="sort.key">{{
        sort.label
      }}</SelectItem>
    </SelectContent>
  </Select>
</template>
