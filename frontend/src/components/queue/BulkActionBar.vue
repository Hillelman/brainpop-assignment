<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/api/http'
import { toUserMessage } from '@/lib/errors'
import { NAME_MAX, cleanName, nameError, sameName } from '@/lib/personName'
import type { BulkReviewFailureReason, Item, ReviewDecision, RiskLevel } from '@/types/api'

const props = defineProps<{ items: Item[] }>()
const emit = defineEmits<{ completed: [] }>()

const NOTE_MAX = 1000
const MAX_LISTED = 3
const NO_RISK = '__none__'
const REASON_LABELS: Record<Exclude<BulkReviewFailureReason, 'same_person'>, string> = {
  already_reviewed: 'already reviewed',
  not_found: 'not found',
}

const risk = ref<RiskLevel | null>(null)
const note = ref('')
const reviewerName = ref('')
const serverNameError = ref<string | undefined>()
const serverConflictIds = ref<number[]>([])
const submitting = ref(false)
const touched = ref(false)

const pendingIds = computed(() =>
  props.items.filter((i) => i.status === 'pending').map((i) => i.id),
)
const nameValidation = computed(() => nameError(reviewerName.value, 'Reviewer name'))
const nameMessage = computed(
  () => serverNameError.value ?? (touched.value ? nameValidation.value : undefined),
)
const conflicts = computed(() =>
  nameValidation.value
    ? []
    : props.items.filter(
        (i) =>
          sameName(i.submitter.name, reviewerName.value) || serverConflictIds.value.includes(i.id),
      ),
)
const conflictMessage = computed(() => {
  const titles = conflicts.value.map((i) => `“${i.title}”`)
  if (titles.length === 0) return undefined
  if (titles.length === 1) {
    return `You submitted ${titles[0]}. Deselect it or use a different name.`
  }
  const shown = titles.slice(0, MAX_LISTED).join(', ')
  const more = titles.length > MAX_LISTED ? ` and ${titles.length - MAX_LISTED} more` : ''
  return `You submitted ${titles.length} of the selected items: ${shown}${more}… Deselect them or use a different name.`
})
const canSubmit = computed(
  () =>
    !submitting.value &&
    pendingIds.value.length > 0 &&
    !nameValidation.value &&
    conflicts.value.length === 0,
)

watch(
  () => props.items,
  () => {
    serverConflictIds.value = []
  },
)
const skipped = computed(() => props.items.length - pendingIds.value.length)

function onRisk(value: unknown): void {
  risk.value = value === NO_RISK ? null : (value as RiskLevel)
}

function onNameInput(): void {
  serverNameError.value = undefined
  serverConflictIds.value = []
}

async function submit(decision: ReviewDecision): Promise<void> {
  touched.value = true
  serverNameError.value = undefined
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const result = await bulkReview({
      ids: pendingIds.value,
      decision,
      risk: risk.value,
      note: note.value.trim() || null,
      reviewer_name: cleanName(reviewerName.value),
    })
    const counts = new Map<Exclude<BulkReviewFailureReason, 'same_person'>, number>()
    const samePersonIds: number[] = []
    for (const f of result.failed) {
      if (f.reason === 'same_person') samePersonIds.push(f.id)
      else counts.set(f.reason, (counts.get(f.reason) ?? 0) + 1)
    }
    const summary = [...counts].map(([reason, n]) => `${n} ${REASON_LABELS[reason]}`).join(', ')
    if (result.updated.length > 0) {
      toast.success(`${result.updated.length} reviewed`)
      if (summary) toast.warning(summary)
    } else if (summary) {
      toast.warning(summary)
    } else {
      toast.success('0 reviewed')
    }
    note.value = ''
    risk.value = null
    if (samePersonIds.length > 0 && result.updated.length === 0) {
      serverConflictIds.value = samePersonIds
      return
    }
    emit('completed')
  } catch (err) {
    const fieldError =
      err instanceof ApiError && err.status === 422 ? err.fieldErrors.reviewer_name?.[0] : undefined
    if (fieldError) serverNameError.value = fieldError
    else toast.error(toUserMessage(err))
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
    <div class="space-y-1">
      <Input
        v-model="reviewerName"
        placeholder="Reviewer name"
        aria-label="Reviewer name"
        autocomplete="off"
        required
        :aria-invalid="!!nameMessage || !!conflictMessage"
        :aria-describedby="conflictMessage ? 'bulk-conflict-error' : undefined"
        :disabled="submitting"
        @update:model-value="onNameInput"
      />
      <p class="text-xs text-muted-foreground">
        {{ cleanName(reviewerName).length }}/{{ NAME_MAX }}
      </p>
      <p v-if="nameMessage" class="text-sm text-destructive" data-test="error-reviewer-name">
        {{ nameMessage }}
      </p>
      <p
        v-if="conflictMessage"
        id="bulk-conflict-error"
        role="alert"
        class="text-sm text-destructive"
        data-test="error-self-review"
      >
        {{ conflictMessage }}
      </p>
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
        <Button :disabled="!canSubmit" data-test="approve" @click="submit('approved')">
          Approve
        </Button>
        <Button
          variant="destructive"
          :disabled="!canSubmit"
          data-test="reject"
          @click="submit('rejected')"
        >
          Reject
        </Button>
      </div>
    </div>
  </div>
</template>
