<script setup lang="ts">
import { X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FilterControls from '@/components/queue/FilterControls.vue'
import type { QueryState } from '@/composables/useQueryState'
import type { FilterMeta } from '@/types/api'

defineProps<{
  query: QueryState
  filters: FilterMeta[]
  metaFailed: boolean
}>()

const emit = defineEmits<{
  update: [patch: Partial<QueryState>]
  retryMeta: []
}>()
</script>

<template>
  <div data-test="queue-toolbar" class="flex flex-col gap-2 sm:flex-row sm:items-start">
    <div
      v-if="metaFailed"
      class="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground"
    >
      <span>Filters could not be loaded.</span>
      <Button variant="outline" size="sm" @click="emit('retryMeta')">Retry</Button>
    </div>
    <FilterControls
      v-else-if="filters.length"
      class="min-w-0 flex-1"
      :filters="filters"
      :model-value="query.filter"
      @update:model-value="(v) => emit('update', { filter: v })"
    />
    <div class="relative w-full sm:w-72 sm:shrink-0">
      <Input
        type="search"
        placeholder="Search items…"
        aria-label="Search items"
        class="pr-9"
        :model-value="query.q"
        @update:model-value="(v) => emit('update', { q: String(v) })"
      />
      <Button
        v-if="query.q"
        variant="ghost"
        size="icon-xs"
        class="absolute top-1/2 right-1.5 -translate-y-1/2"
        aria-label="Clear search"
        @click="emit('update', { q: '' })"
      >
        <X />
      </Button>
    </div>
  </div>
</template>
