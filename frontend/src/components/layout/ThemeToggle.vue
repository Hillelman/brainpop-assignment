<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'

const { theme, toggle } = useTheme()
const isDark = computed(() => theme.value === 'dark')
const label = computed(() => (isDark.value ? 'Switch to light theme' : 'Switch to dark theme'))
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    :aria-label="label"
    :aria-pressed="isDark"
    @click="toggle"
  >
    <Sun v-if="isDark" data-testid="theme-icon-sun" />
    <Moon v-else data-testid="theme-icon-moon" />
  </Button>
</template>
