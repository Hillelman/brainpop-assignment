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

const ALL = '__all__'

defineProps<{
  filter: FilterMeta
  value: string | undefined
  accessibleName: string
}>()

const emit = defineEmits<{ change: [value: string | undefined] }>()
</script>

<template>
  <Select
    v-if="filter.type === 'select'"
    :model-value="value ?? ALL"
    @update:model-value="(v) => emit('change', v === ALL ? undefined : (v as string))"
  >
    <SelectTrigger class="w-40" :aria-label="accessibleName" data-test="filter-control">
      <SelectValue :placeholder="filter.label" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem :value="ALL">{{ filter.label }}: all</SelectItem>
      <SelectItem v-for="option in filter.options ?? []" :key="option.value" :value="option.value">
        {{ option.label }}
      </SelectItem>
    </SelectContent>
  </Select>
  <Input
    v-else
    :type="filter.type === 'date' ? 'date' : 'text'"
    class="w-40"
    :aria-label="accessibleName"
    :model-value="value ?? ''"
    data-test="filter-control"
    @update:model-value="(v) => emit('change', String(v))"
  />
</template>
