<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import AppToaster from '@/components/common/AppToaster.vue'
</script>

<template>
  <ErrorBoundary>
    <AppLayout>
      <RouterView />
    </AppLayout>
  </ErrorBoundary>
  <AppToaster />
</template>
