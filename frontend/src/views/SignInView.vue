<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SignIn } from '@clerk/vue'
import { safeRedirect } from '@/lib/safeRedirect'

const route = useRoute()

const redirectUrl = computed(() => safeRedirect(route.query.redirect))
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-6">
    <SignIn routing="path" path="/sign-in" :force-redirect-url="redirectUrl" />
  </main>
</template>
