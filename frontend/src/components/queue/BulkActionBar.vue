<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { bulkReview } from '@/api/items'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toUserMessage } from '@/lib/errors'
import type { BulkReviewFailureReason, Item, ReviewDecision, RiskLevel } from '@/types/api'

const props = defineProps<{ items: Item[] }>()
const emit = defineEmits<{ completed: [] }>()

const NOTE_MAX = 1000
const NO_RISK = '__none__'
const REASON_LABELS: Record<BulkReviewFailureReason, string> = {
  not_found: 'not found',
  already_reviewed: 'already reviewed',
}

const risk = ref<RiskLevel | null>(null)
const note = ref('')
const submitting = ref(false)

const pendingIds = computed(() =>
  props.items.filter((i) => i.status === 'pending').map((i) => i.id),
)
const skipped = computed(() => props.items.length - pendingIds.value.length)

function onRisk(value: unknown): void {
  risk.value = value === NO_RISK ? null : (value as RiskLevel)
}

async function submit(decision: ReviewDecision): Promise<void> {
  if (submitting.value || pendingIds.value.length === 0) return
  submitting.value = true
  try {
    const result = await bulkReview({
      ids: pendingIds.value,
      decision,
      risk: risk.value,
      note: note.value.trim() || null,
    })
    toast.success(`${result.updated.length} reviewed`)
    if (result.failed.length > 0) {
      const counts = new Map<BulkReviewFailureReason, number>()
      for (const f of result.failed) counts.set(f.reason, (counts.get(f.reason) ?? 0) + 1)
      const summary = [...counts].map(([reason, n]) => `${n} ${REASON_LABELS[reason]}`).join(', ')
      toast.warning(`${result.failed.length} could not be reviewed: ${summary}`)
    }
    note.value = ''
    risk.value = null
    emit('completed')
  } catch (err) {
    toast.error(toUserMessage(err))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    class="sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-lg"
    data-test="bulk-bar"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium">{{ items.length }} selected</span>
      <span v-if="skipped > 0" class="text-sm text-amber-700" data-test="skip-warning">
        {{ skipped }} already reviewed and will be skipped.
      </span>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
      <Select :model-value="risk ?? NO_RISK" :disabled="submitting" @update:model-value="onRisk">
        <SelectTrigger class="w-full sm:w-40" aria-label="Risk">
          <SelectValue placeholder="Risk" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="NO_RISK">No risk</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        v-model="note"
        class="min-h-9 flex-1"
        placeholder="Optional note"
        aria-label="Note"
        :maxlength="NOTE_MAX"
        :disabled="submitting"
      />
      <div class="flex gap-2">
        <Button
          :disabled="submitting || pendingIds.length === 0"
          data-test="approve"
          @click="submit('approved')"
        >
          Approve
        </Button>
        <Button
          variant="destructive"
          :disabled="submitting || pendingIds.length === 0"
          data-test="reject"
          @click="submit('rejected')"
        >
          Reject
        </Button>
      </div>
    </div>
  </div>
</template>
