<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

withDefaults(defineProps<{ rows?: number }>(), { rows: 6 })
</script>

<template>
  <div
    class="flex flex-col gap-2"
    data-test="items-skeleton"
    aria-busy="true"
    aria-label="Loading items"
  >
    <Skeleton v-for="n in rows" :key="n" class="h-12 w-full" />
  </div>
</template>
