<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toUserMessage } from '@/lib/errors'

const error = ref<unknown>(null)
const renderKey = ref(0)

onErrorCaptured((err) => {
  error.value = err
  return false
})

function retry() {
  error.value = null
  renderKey.value += 1
}
</script>

<template>
  <Card v-if="error" role="alert" class="mx-auto my-8 max-w-md">
    <CardHeader>
      <CardTitle>Something went wrong</CardTitle>
      <CardDescription>{{ toUserMessage(error) }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Button @click="retry">Retry</Button>
    </CardContent>
  </Card>
  <slot v-else :key="renderKey" />
</template>
