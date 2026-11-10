<script setup lang="ts">
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PER_PAGE_OPTIONS } from '@/composables/useQueryState'
import type { PaginationMeta } from '@/types/api'

defineProps<{ meta: PaginationMeta }>()
const emit = defineEmits<{ 'update:page': [page: number]; 'update:perPage': [perPage: number] }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{{ meta.total }} items</span>
      <Select
        :model-value="String(meta.per_page)"
        @update:model-value="(v) => emit('update:perPage', Number(v))"
      >
        <SelectTrigger class="w-28" size="sm" aria-label="Items per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="n in PER_PAGE_OPTIONS" :key="n" :value="String(n)"
            >{{ n }} / page</SelectItem
          >
        </SelectContent>
      </Select>
    </div>
    <Pagination
      v-if="meta.last_page > 1"
      v-slot="{ page }"
      class="mx-0 w-auto"
      :total="meta.total"
      :items-per-page="meta.per_page"
      :page="meta.current_page"
      :sibling-count="1"
      @update:page="(p) => emit('update:page', p)"
    >
      <PaginationContent v-slot="{ items }">
        <PaginationPrevious />
        <template v-for="(entry, index) in items" :key="index">
          <PaginationItem
            v-if="entry.type === 'page'"
            :value="entry.value"
            :is-active="entry.value === page"
          >
            {{ entry.value }}
          </PaginationItem>
          <PaginationEllipsis v-else :index="index" />
        </template>
        <PaginationNext />
      </PaginationContent>
    </Pagination>
  </div>
</template>
