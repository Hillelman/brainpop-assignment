<script setup lang="ts">
import { RouterLink } from 'vue-router'
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
import type { Item } from '@/types/api'

const props = defineProps<{
  items: Item[]
  selectedIds: number[]
  allSelected: boolean
}>()

const emit = defineEmits<{ toggle: [id: number]; toggleAll: [] }>()

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
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Submitter</TableHead>
            <TableHead>Created</TableHead>
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
