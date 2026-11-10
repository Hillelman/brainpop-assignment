<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useItem } from '@/composables/useItem'
import { useItemReviews } from '@/composables/useItemReviews'
import { toUserMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import ItemDetailCard from '@/components/item/ItemDetailCard.vue'
import ItemDetailSkeleton from '@/components/item/ItemDetailSkeleton.vue'
import ItemNotFound from '@/components/item/ItemNotFound.vue'
import ReviewForm from '@/components/item/ReviewForm.vue'
import ReviewHistory from '@/components/item/ReviewHistory.vue'

const props = defineProps<{ id: string }>()

const router = useRouter()
const itemId = computed(() => Number(props.id))
const { item, loading, error, notFound, refresh } = useItem(itemId)
const history = useItemReviews(itemId)
const { copy, copied } = useClipboard({ legacy: true })

const backTo = computed(() => {
  const previous: unknown = router.options.history.state.back
  if (typeof previous === 'string' && /^\/items(\?|$)/.test(previous)) return previous
  return '/items'
})

async function onReviewed(): Promise<void> {
  await Promise.all([refresh(), history.refresh()])
}

function onReviewNotFound(): void {
  item.value = null
  notFound.value = true
}

async function copyLink(): Promise<void> {
  try {
    await copy(window.location.href)
    toast.success('Link copied')
  } catch (err) {
    toast.error(toUserMessage(err))
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <div class="flex items-center justify-between">
      <RouterLink :to="backTo" class="text-sm underline" data-test="back-link">
        Back to queue
      </RouterLink>
      <Button v-if="item" variant="outline" size="sm" @click="copyLink">
        {{ copied ? 'Copied' : 'Copy link' }}
      </Button>
    </div>

    <ItemDetailSkeleton v-if="loading && !item" />
    <ItemNotFound v-else-if="notFound" />
    <div v-else-if="error && !item" class="space-y-2" role="alert" data-test="item-error">
      <p class="text-destructive">{{ toUserMessage(error) }}</p>
      <Button variant="outline" size="sm" @click="refresh">Retry</Button>
    </div>
    <template v-else-if="item">
      <ItemDetailCard :item="item" />
      <ReviewForm
        v-if="item.status === 'pending'"
        :item-id="item.id"
        @reviewed="onReviewed"
        @not-found="onReviewNotFound"
      />
      <ReviewHistory
        :reviews="history.reviews.value"
        :loading="history.loading.value"
        :has-more="history.hasMore()"
        :error="!!history.error.value"
        @load-more="history.loadMore"
      />
    </template>
  </section>
</template>
