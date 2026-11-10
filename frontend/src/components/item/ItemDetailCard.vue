<script setup lang="ts">
import StatusBadge from '@/components/items/StatusBadge.vue'
import RiskBadge from '@/components/items/RiskBadge.vue'
import type { Item } from '@/types/api'

defineProps<{ item: Item }>()

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}
</script>

<template>
  <article class="space-y-4 rounded-lg border p-6">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-semibold" data-test="item-title">{{ item.title }}</h1>
      <div class="flex items-center gap-2">
        <StatusBadge :status="item.status" />
        <RiskBadge :risk="item.risk" />
      </div>
    </header>
    <p class="whitespace-pre-wrap" data-test="item-description">{{ item.description }}</p>
    <dl class="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
      <dt>Submitted by</dt>
      <dd data-test="item-submitter">{{ item.submitter.name }}</dd>
      <dt>Created</dt>
      <dd>{{ formatDate(item.created_at) }}</dd>
      <dt>Updated</dt>
      <dd>{{ formatDate(item.updated_at) }}</dd>
    </dl>
    <section
      v-if="item.status !== 'pending' && item.latest_review"
      class="rounded-md bg-muted p-4 text-sm"
      data-test="item-outcome"
    >
      <h2 class="font-medium">Outcome</h2>
      <p>
        {{ item.latest_review.decision === 'approved' ? 'Approved' : 'Rejected' }} by
        {{ item.latest_review.reviewer.name }} on {{ formatDate(item.latest_review.created_at) }}
      </p>
      <p>Risk: {{ item.latest_review.risk ?? '—' }}</p>
      <p v-if="item.latest_review.note" class="whitespace-pre-wrap">
        {{ item.latest_review.note }}
      </p>
    </section>
  </article>
</template>
