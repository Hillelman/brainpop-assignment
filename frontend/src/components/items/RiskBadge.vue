<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import type { RiskLevel } from '@/types/api'

const props = defineProps<{ risk: RiskLevel | null }>()

const LABELS: Record<RiskLevel, string> = { low: 'Low', medium: 'Medium', high: 'High' }

const CLASSES: Record<RiskLevel, string> = {
  low: 'border-transparent bg-emerald-100 text-emerald-900',
  medium: 'border-transparent bg-orange-100 text-orange-900',
  high: 'border-transparent bg-red-100 text-red-900',
}

const label = computed(() => (props.risk ? LABELS[props.risk] : '—'))
const classes = computed(() => (props.risk ? CLASSES[props.risk] : 'text-muted-foreground'))
</script>

<template>
  <Badge variant="outline" :class="classes">{{ label }}</Badge>
</template>
