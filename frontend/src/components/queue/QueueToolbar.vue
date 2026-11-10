<script setup lang="ts">
import { X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FilterControls from '@/components/queue/FilterControls.vue'
import SortSelect from '@/components/queue/SortSelect.vue'
import type { QueryState, QueueState } from '@/composables/useQueryState'
import type { FilterMeta, SortMeta } from '@/types/api'

defineProps<{
  query: QueryState
  filters: FilterMeta[]
  sorts: SortMeta[]
  metaFailed: boolean
}>()

const emit = defineEmits<{
  update: [patch: Partial<QueryState>]
  retryMeta: []
}>()

const TABS: { value: QueueState; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'all', label: 'All' },
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Tabs
        :model-value="query.state"
        @update:model-value="(v) => emit('update', { state: v as QueueState })"
      >
        <TabsList>
          <TabsTrigger v-for="tab in TABS" :key="tab.value" :value="tab.value">{{
            tab.label
          }}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div class="relative w-full sm:w-72">
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
    <div v-if="metaFailed" class="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Filters could not be loaded.</span>
      <Button variant="outline" size="sm" @click="emit('retryMeta')">Retry</Button>
    </div>
    <div v-else-if="filters.length || sorts.length" class="flex flex-wrap items-center gap-2">
      <FilterControls
        :filters="filters"
        :model-value="query.filter"
        @update:model-value="(v) => emit('update', { filter: v })"
      />
      <SortSelect
        v-if="sorts.length"
        :sorts="sorts"
        :model-value="query.sort"
        @update:model-value="(v) => emit('update', { sort: v })"
      />
    </div>
  </div>
</template>
