<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SignIn } from '@clerk/vue'

const route = useRoute()

const redirectUrl = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/items'
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-6">
    <SignIn routing="path" path="/sign-in" :force-redirect-url="redirectUrl" />
  </main>
</template>
