<script setup lang="ts">
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
</script>

<template>
  <EmptyState title="Item not found" description="This item does not exist or was removed.">
    <RouterLink to="/items" class="text-sm font-medium underline">Back to queue</RouterLink>
  </EmptyState>
</template>
