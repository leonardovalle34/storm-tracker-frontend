<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const { theme, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="theme === 'dark'"
    :aria-label="t('header.themeToggle')"
    :title="t('header.themeToggle')"
    class="inline-flex h-9 w-9 items-center justify-center rounded-md text-brand-fg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
    @click="toggle"
  >
    <svg data-testid="switch-icon" width="28" height="18" viewBox="0 0 28 18" aria-hidden="true">
      <rect x="1" y="1" width="26" height="16" rx="8" fill="none" stroke="currentColor" stroke-width="2" />
      <circle :cx="theme === 'dark' ? 19 : 9" cy="9" r="4.5" fill="currentColor" class="transition-all" />
    </svg>
  </button>
</template>
