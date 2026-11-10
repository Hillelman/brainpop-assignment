<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { nextSort, parseSort, sortableColumns } from '@/components/queue/sorting'
import type { SortMeta } from '@/types/api'

const props = defineProps<{ sorts: SortMeta[]; sort: string }>()
const emit = defineEmits<{ update: [sort: string] }>()

const columns = computed(() => sortableColumns(props.sorts))
const active = computed(() => parseSort(props.sort))
const activeColumn = computed(() => columns.value.find((c) => c.key === active.value.key))
</script>

<template>
  <DropdownMenu v-if="columns.length">
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" class="md:hidden" aria-label="Sort items">
        Sort: {{ activeColumn?.label ?? 'None' }}
        <template v-if="activeColumn">
          <ArrowDown v-if="active.descending" />
          <ArrowUp v-else />
        </template>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem
        v-for="column in columns"
        :key="column.key"
        @select="emit('update', nextSort(sort, column.key))"
      >
        {{ column.label }}
        <template v-if="column.key === active.key">
          <ArrowDown v-if="active.descending" class="ml-auto" />
          <ArrowUp v-else class="ml-auto" />
        </template>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
