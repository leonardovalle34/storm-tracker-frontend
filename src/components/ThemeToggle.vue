<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const { theme, toggle } = useTheme()
const tipId = `theme-tip-${useId()}`

const isDark = computed(() => theme.value === 'dark')
</script>

<template>
  <div class="group relative inline-flex">
    <button
      type="button"
      role="switch"
      :aria-checked="isDark"
      :aria-label="t('header.themeToggle')"
      :aria-describedby="tipId"
      class="inline-flex h-9 items-center justify-center gap-2 rounded-md px-2 text-brand-fg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
      @click="toggle"
    >
      <svg data-testid="switch-icon" width="28" height="18" viewBox="0 0 28 18" aria-hidden="true">
        <rect x="1" y="1" width="26" height="16" rx="8" fill="none" stroke="currentColor" stroke-width="2" />
        <circle :cx="isDark ? 19 : 9" cy="9" r="4.5" fill="currentColor" class="transition-all" />
      </svg>
      <!-- current theme, spelled out (hidden on the narrowest screens; the tooltip covers them) -->
      <span data-testid="theme-label" class="hidden text-sm sm:inline">{{
        isDark ? t('header.themeDark') : t('header.themeLight')
      }}</span>
    </button>
    <span
      :id="tipId"
      role="tooltip"
      class="invisible absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-line bg-surface p-2 text-xs font-normal leading-snug text-ink opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
    >
      {{
        t('header.themeTooltip', { mode: isDark ? t('header.themeModeDark') : t('header.themeModeLight') })
      }}
    </span>
  </div>
</template>
