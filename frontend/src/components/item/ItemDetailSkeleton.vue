<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
</script>

<template>
  <div data-test="item-skeleton" class="space-y-4">
    <Skeleton class="h-8 w-2/3" />
    <Skeleton class="h-4 w-1/3" />
    <Skeleton class="h-24 w-full" />
    <Skeleton class="h-10 w-48" />
  </div>
</template>
