<script setup lang="ts">
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FilterMeta } from '@/types/api'

const props = defineProps<{
  filters: FilterMeta[]
  modelValue: Record<string, string>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: Record<string, string>] }>()

const ALL = '__all__'

function setFilter(key: string, value: string | undefined): void {
  const next = { ...props.modelValue }
  if (!value || value === ALL) delete next[key]
  else next[key] = value
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" data-test="filter-controls">
    <template v-for="filter in filters" :key="filter.key">
      <Select
        v-if="filter.type === 'select'"
        :model-value="modelValue[filter.key] ?? ALL"
        @update:model-value="(v) => setFilter(filter.key, v as string)"
      >
        <SelectTrigger class="w-40" :aria-label="filter.label" data-test="filter-control">
          <SelectValue :placeholder="filter.label" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">{{ filter.label }}: all</SelectItem>
          <SelectItem
            v-for="option in filter.options ?? []"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Input
        v-else
        :type="filter.type === 'date' ? 'date' : 'text'"
        class="w-40"
        :aria-label="filter.label"
        :model-value="modelValue[filter.key] ?? ''"
        data-test="filter-control"
        @update:model-value="(v) => setFilter(filter.key, String(v))"
      />
    </template>
  </div>
</template>
