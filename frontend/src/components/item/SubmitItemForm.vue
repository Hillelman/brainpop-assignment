<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { createItem } from '@/api/items'
import { ApiError } from '@/api/http'
import { toUserMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const TITLE_MIN = 3
const TITLE_MAX = 120
const DESCRIPTION_MAX = 5000

type Field = 'title' | 'description'

const router = useRouter()
const title = ref('')
const description = ref('')
const submitted = ref(false)
const pending = ref(false)
const serverErrors = reactive<Record<Field, string | undefined>>({
  title: undefined,
  description: undefined,
})

const clientErrors = computed<Record<Field, string | undefined>>(() => {
  const trimmed = title.value.trim()
  return {
    title:
      trimmed.length < TITLE_MIN
        ? `Title must be at least ${TITLE_MIN} characters.`
        : trimmed.length > TITLE_MAX
          ? `Title must be at most ${TITLE_MAX} characters.`
          : undefined,
    description: !description.value.trim()
      ? 'Description is required.'
      : description.value.length > DESCRIPTION_MAX
        ? `Description must be at most ${DESCRIPTION_MAX} characters.`
        : undefined,
  }
})

function errorFor(field: Field): string | undefined {
  if (serverErrors[field]) return serverErrors[field]
  return submitted.value ? clientErrors.value[field] : undefined
}

function clearServer(field: Field): void {
  serverErrors[field] = undefined
}

async function submit(): Promise<void> {
  if (pending.value) return
  submitted.value = true
  serverErrors.title = undefined
  serverErrors.description = undefined
  if (clientErrors.value.title || clientErrors.value.description) return
  pending.value = true
  try {
    const item = await createItem({ title: title.value.trim(), description: description.value })
    toast.success('Item submitted')
    await router.push('/items/' + item.id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      serverErrors.title = err.fieldErrors.title?.[0]
      serverErrors.description = err.fieldErrors.description?.[0]
      if (!serverErrors.title && !serverErrors.description) toast.error(toUserMessage(err))
    } else {
      toast.error(toUserMessage(err))
    }
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="space-y-4" novalidate data-test="submit-form" @submit.prevent="submit">
    <div class="space-y-1">
      <Label for="item-title">Title</Label>
      <Input
        id="item-title"
        v-model="title"
        :aria-invalid="!!errorFor('title')"
        @update:model-value="clearServer('title')"
      />
      <p v-if="errorFor('title')" class="text-sm text-destructive" data-test="error-title">
        {{ errorFor('title') }}
      </p>
    </div>
    <div class="space-y-1">
      <Label for="item-description">Description</Label>
      <Textarea
        id="item-description"
        v-model="description"
        :aria-invalid="!!errorFor('description')"
        @update:model-value="clearServer('description')"
      />
      <p
        v-if="errorFor('description')"
        class="text-sm text-destructive"
        data-test="error-description"
      >
        {{ errorFor('description') }}
      </p>
    </div>
    <Button type="submit" :disabled="pending">{{ pending ? 'Submitting…' : 'Submit item' }}</Button>
  </form>
</template>
