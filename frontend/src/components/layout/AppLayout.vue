<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <nav class="flex items-center gap-4 text-sm font-medium" aria-label="Main">
          <RouterLink
            to="/items"
            class="text-muted-foreground hover:text-foreground"
            active-class="!text-foreground"
            exact-active-class="!text-foreground"
            >Queue</RouterLink
          >
          <RouterLink
            to="/items/new"
            class="text-muted-foreground hover:text-foreground"
            exact-active-class="!text-foreground"
            >Submit</RouterLink
          >
        </nav>
        <ThemeToggle />
      </div>
    </header>
    <main class="mx-auto max-w-6xl p-4">
      <slot />
    </main>
  </div>
</template>
