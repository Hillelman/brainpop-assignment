<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

defineProps<{ message: string }>()
</script>

<template>
  <main class="mx-auto max-w-lg p-6">
    <Alert variant="destructive" role="alert">
      <AlertTitle>Configuration error</AlertTitle>
      <AlertDescription>{{ message }}</AlertDescription>
    </Alert>
  </main>
</template>
