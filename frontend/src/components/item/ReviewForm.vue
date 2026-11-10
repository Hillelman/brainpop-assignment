<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { bulkReview } from '@/api/items'
import { toUserMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ReviewDecision, RiskLevel } from '@/types/api'

const NOTE_MAX = 1000

const props = defineProps<{ itemId: number }>()
const emit = defineEmits<{ (e: 'reviewed'): void; (e: 'not-found'): void }>()

const decision = ref<ReviewDecision>('approved')
const risk = ref<RiskLevel | ''>('')
const note = ref('')
const pending = ref(false)

const noteTooLong = computed(() => note.value.length > NOTE_MAX)

async function submit(): Promise<void> {
  if (pending.value || noteTooLong.value) return
  pending.value = true
  try {
    const trimmed = note.value.trim()
    const result = await bulkReview({
      ids: [props.itemId],
      decision: decision.value,
      risk: risk.value || null,
      note: trimmed || null,
    })
    const failure = result.failed.find((f) => f.id === props.itemId)
    if (result.updated.some((i) => i.id === props.itemId)) {
      toast.success('Review submitted')
      emit('reviewed')
    } else if (failure?.reason === 'already_reviewed') {
      toast.info('Already reviewed by someone else')
      emit('reviewed')
    } else if (failure?.reason === 'not_found') {
      emit('not-found')
    }
  } catch (err) {
    toast.error(toUserMessage(err))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="space-y-4 rounded-lg border p-6" data-test="review-form" @submit.prevent="submit">
    <h2 class="text-lg font-semibold">Review this item</h2>
    <fieldset class="flex gap-4">
      <legend class="sr-only">Decision</legend>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="decision" type="radio" name="decision" value="approved" />
        Approve
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="decision" type="radio" name="decision" value="rejected" />
        Reject
      </label>
    </fieldset>
    <div class="space-y-1">
      <Label for="review-risk">Risk</Label>
      <select
        id="review-risk"
        v-model="risk"
        class="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      >
        <option value="">No risk assigned</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>
    <div class="space-y-1">
      <Label for="review-note">Note (optional)</Label>
      <Textarea id="review-note" v-model="note" :aria-invalid="noteTooLong" />
      <p
        class="text-xs"
        :class="noteTooLong ? 'text-destructive' : 'text-muted-foreground'"
        data-test="note-counter"
      >
        {{ note.length }}/{{ NOTE_MAX }}
      </p>
    </div>
    <Button type="submit" :disabled="pending || noteTooLong">
      {{ pending ? 'Submitting…' : 'Submit review' }}
    </Button>
  </form>
</template>
