<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import RiskBadge from '@/components/items/RiskBadge.vue'
import { Button } from '@/components/ui/button'
import type { Review } from '@/types/api'

defineProps<{
  reviews: Review[]
  loading: boolean
  hasMore: boolean
  error?: boolean
}>()

const emit = defineEmits<{ (e: 'load-more'): void }>()
</script>

<template>
  <section class="space-y-3">
    <h2 class="text-lg font-semibold">Review history</h2>
    <p v-if="error" class="text-sm text-destructive" role="alert">Could not load review history.</p>
    <EmptyState v-if="!reviews.length && !loading && !error" title="No reviews yet" />
    <ul v-if="reviews.length" class="space-y-2">
      <li
        v-for="review in reviews"
        :key="review.id"
        class="rounded-md border p-3 text-sm"
        data-test="review-entry"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-medium">
            {{ review.decision === 'approved' ? 'Approved' : 'Rejected' }}
          </span>
          <RiskBadge :risk="review.risk" />
          <span class="text-muted-foreground">
            by {{ review.reviewer.name }} · {{ new Date(review.created_at).toLocaleString() }}
          </span>
        </div>
        <p v-if="review.note" class="mt-1 whitespace-pre-wrap">{{ review.note }}</p>
      </li>
    </ul>
    <Button
      v-if="hasMore"
      variant="outline"
      size="sm"
      :disabled="loading"
      @click="emit('load-more')"
    >
      Load more
    </Button>
  </section>
</template>
