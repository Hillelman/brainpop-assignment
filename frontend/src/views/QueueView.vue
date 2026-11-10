<script setup lang="ts">
import { computed } from 'vue'
import { ApiError } from '@/api/http'
import EmptyState from '@/components/common/EmptyState.vue'
import BulkActionBar from '@/components/queue/BulkActionBar.vue'
import ItemsTable from '@/components/queue/ItemsTable.vue'
import ItemsTableSkeleton from '@/components/queue/ItemsTableSkeleton.vue'
import QueuePagination from '@/components/queue/QueuePagination.vue'
import QueueToolbar from '@/components/queue/QueueToolbar.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useFilterMeta } from '@/composables/useFilterMeta'
import { useItemsQuery } from '@/composables/useItemsQuery'
import { useQueryState } from '@/composables/useQueryState'
import { useSelection } from '@/composables/useSelection'
import { toUserMessage } from '@/lib/errors'

const { query, update, reset } = useQueryState()
const { items, meta, loading, error, refresh } = useItemsQuery(query)
const { filters, sorts, error: metaError, retry: retryMeta } = useFilterMeta()
const selection = useSelection(() => JSON.stringify(query.value))

const selectedItems = computed(() => items.value.filter((i) => selection.isSelected(i.id)))
const isValidationError = computed(
  () => error.value instanceof ApiError && error.value.status === 422,
)
const hasCriteria = computed(
  () => query.value.q !== '' || Object.keys(query.value.filter).length > 0,
)

async function onCompleted(): Promise<void> {
  selection.clear()
  await refresh()
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold">Review Queue</h1>

    <QueueToolbar
      :query="query"
      :filters="filters"
      :meta-failed="metaError !== null"
      @update="update"
      @retry-meta="retryMeta"
    />

    <ItemsTableSkeleton v-if="loading" />

    <Alert v-else-if="error" variant="destructive" data-test="list-error">
      <AlertTitle>{{
        isValidationError ? 'Invalid search or filters' : 'Could not load items'
      }}</AlertTitle>
      <AlertDescription>
        <p>{{ isValidationError ? (error as ApiError).message : toUserMessage(error) }}</p>
        <div class="mt-2">
          <Button v-if="isValidationError" variant="outline" size="sm" @click="reset">Reset</Button>
          <Button v-else variant="outline" size="sm" @click="refresh">Retry</Button>
        </div>
      </AlertDescription>
    </Alert>

    <EmptyState
      v-else-if="items.length === 0"
      :title="
        hasCriteria
          ? `No results for ${query.q ? `“${query.q}”` : 'these filters'}`
          : 'No items yet'
      "
    >
      <Button v-if="hasCriteria" variant="outline" size="sm" @click="update({ q: '', filter: {} })">
        Clear filters
      </Button>
    </EmptyState>

    <template v-else>
      <ItemsTable
        :items="items"
        :selected-ids="selection.ids.value"
        :all-selected="selection.allSelected(items.map((i) => i.id))"
        :sorts="sorts"
        :sort="query.sort"
        @sort="(sort) => update({ sort })"
        @toggle="selection.toggle"
        @toggle-all="selection.toggleAll(items.map((i) => i.id))"
      />
      <QueuePagination
        v-if="meta"
        :meta="meta"
        @update:page="(page) => update({ page })"
        @update:per-page="(perPage) => update({ perPage })"
      />
    </template>

    <BulkActionBar
      v-if="selectedItems.length > 0"
      :items="selectedItems"
      @completed="onCompleted"
    />
  </section>
</template>
