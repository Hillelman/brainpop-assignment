<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import type { ItemStatus } from '@/types/api'

const props = defineProps<{ status: ItemStatus }>()

const LABELS: Record<ItemStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const CLASSES: Record<ItemStatus, string> = {
  pending: 'border-transparent bg-amber-100 text-amber-900',
  approved: 'border-transparent bg-green-100 text-green-900',
  rejected: 'border-transparent bg-red-100 text-red-900',
}

const label = computed(() => LABELS[props.status])
</script>

<template>
  <Badge variant="outline" :class="CLASSES[status]">{{ label }}</Badge>
</template>
