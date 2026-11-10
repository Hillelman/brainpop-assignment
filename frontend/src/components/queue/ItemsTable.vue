<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import RiskBadge from '@/components/items/RiskBadge.vue'
import StatusBadge from '@/components/items/StatusBadge.vue'
import MobileSortMenu from '@/components/queue/MobileSortMenu.vue'
import { nextSort, parseSort, SORT_COLUMNS, sortableColumns } from '@/components/queue/sorting'
import type { Item, SortMeta } from '@/types/api'

const props = defineProps<{
  items: Item[]
  selectedIds: number[]
  allSelected: boolean
  sorts: SortMeta[]
  sort: string
}>()

const emit = defineEmits<{ toggle: [id: number]; toggleAll: []; sort: [sort: string] }>()

const sortable = computed(() => new Set(sortableColumns(props.sorts).map((c) => c.key)))
const active = computed(() => parseSort(props.sort))

function ariaSort(key: string): 'ascending' | 'descending' | 'none' | undefined {
  if (!sortable.value.has(key)) return undefined
  if (active.value.key !== key) return 'none'
  return active.value.descending ? 'descending' : 'ascending'
}

function isSelected(id: number): boolean {
  return props.selectedIds.includes(id)
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}
</script>

<template>
  <div>
    <div class="hidden rounded-md border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-10">
              <Checkbox
                aria-label="Select all on page"
                :model-value="allSelected"
                @update:model-value="emit('toggleAll')"
              />
            </TableHead>
            <TableHead
              v-for="column in SORT_COLUMNS"
              :key="column.key"
              :aria-sort="ariaSort(column.key)"
            >
              <button
                v-if="sortable.has(column.key)"
                type="button"
                class="group -ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                @click="emit('sort', nextSort(sort, column.key))"
              >
                {{ column.label }}
                <ArrowDown v-if="ariaSort(column.key) === 'descending'" class="size-4" />
                <ArrowUp v-else-if="ariaSort(column.key) === 'ascending'" class="size-4" />
                <ArrowUpDown
                  v-else
                  class="size-4 opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50"
                />
              </button>
              <template v-else>{{ column.label }}</template>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in items"
            :key="item.id"
            :data-state="isSelected(item.id) ? 'selected' : undefined"
          >
            <TableCell>
              <Checkbox
                :aria-label="`Select ${item.title}`"
                :model-value="isSelected(item.id)"
                @update:model-value="emit('toggle', item.id)"
              />
            </TableCell>
            <TableCell class="font-medium">
              <RouterLink :to="`/items/${item.id}`" class="hover:underline">{{
                item.title
              }}</RouterLink>
            </TableCell>
            <TableCell><StatusBadge :status="item.status" /></TableCell>
            <TableCell><RiskBadge :risk="item.risk" /></TableCell>
            <TableCell>{{ item.submitter.name }}</TableCell>
            <TableCell class="text-muted-foreground">{{ formatDate(item.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="mb-2 md:hidden">
      <MobileSortMenu :sorts="sorts" :sort="sort" @update="emit('sort', $event)" />
    </div>

    <ul class="flex flex-col gap-2 md:hidden">
      <li v-for="item in items" :key="item.id">
        <Card class="py-3">
          <CardContent class="flex gap-3 px-3">
            <Checkbox
              class="mt-1"
              :aria-label="`Select ${item.title}`"
              :model-value="isSelected(item.id)"
              @update:model-value="emit('toggle', item.id)"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <RouterLink :to="`/items/${item.id}`" class="font-medium hover:underline">{{
                item.title
              }}</RouterLink>
              <div class="flex flex-wrap gap-1">
                <StatusBadge :status="item.status" />
                <RiskBadge :risk="item.risk" />
              </div>
              <p class="text-xs text-muted-foreground">
                {{ item.submitter.name }} · {{ formatDate(item.created_at) }}
              </p>
            </div>
          </CardContent>
        </Card>
      </li>
    </ul>
  </div>
</template>
